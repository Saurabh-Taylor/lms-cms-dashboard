// Cookie names shared by middleware (edge-safe) and server code. Kept separate
// from lib/me.ts so middleware doesn't pull in the API client.
//
// SESSION_COOKIE is the Better Auth session token issued by the NestJS API and
// forwarded through /api/auth/* route handlers — the browser only ever stores
// it on this origin.
export const SESSION_COOKIE = "learnhub.session_token";

// Mirrors the signed-in persona so middleware can gate portals without an API
// hit. Unsigned hint only — pages/routes re-validate the session server-side.
export const ROLE_COOKIE = "lh_role";

/** Where each portal role lands after sign-in / when visiting a foreign portal. */
export function homeForRole(role: string): string {
  return role === "admin" ? "/admin/dashboard" : "/learner/dashboard";
}

/** Backend appRoles that belong to the admin portal (matches backend rbac.ts). */
const ADMIN_APP_ROLES = new Set(["super_admin", "admin", "content_manager", "support"]);

/**
 * appRole → portal persona ("admin" | "instructor" | "learner"). Single
 * mapping used by me.ts and the login route — must stay in sync with the
 * backend's personaFor() in src/modules/auth/rbac.ts.
 */
export function portalRole(appRole: string): string {
  if (ADMIN_APP_ROLES.has(appRole)) return "admin";
  return appRole === "instructor" ? "instructor" : "learner";
}

/** Portal role → backend appRole when provisioning (inverse of portalRole). */
export function appRoleFor(portal: string): string {
  if (portal === "admin") return "admin";
  return portal === "instructor" ? "instructor" : "learner";
}
