// Cookie names shared by middleware (edge-safe) and server code. Kept separate
// from lib/me.ts so middleware doesn't pull in the API client.
//
// SESSION_COOKIE is the Better Auth session token issued by the NestJS API and
// forwarded through /api/auth/* route handlers — the browser only ever stores
// it on this origin.
export { AUTH_SESSION_COOKIE as SESSION_COOKIE } from "@microshala/contracts";
export { AUTH_SESSION_DATA_COOKIE as SESSION_DATA_COOKIE } from "@microshala/contracts";
// BA's remember-me preference flag (cleared by BA on sign-out; kept here so
// the logout route can drop it locally when the upstream call fails).
export { AUTH_DONT_REMEMBER_COOKIE as DONT_REMEMBER_COOKIE } from "@microshala/contracts";

// Mirrors the signed-in persona so middleware can gate portals without an API
// hit. Unsigned hint only — pages/routes re-validate the session server-side.
export { AUTH_ROLE_COOKIE as ROLE_COOKIE } from "@microshala/contracts";

/** Where each portal role lands after sign-in / when visiting a foreign portal. */
export function homeForRole(role: string): string {
  return role === "admin" ? "/admin/dashboard" : "/learner/dashboard";
}

/**
 * appRole → portal persona ("admin" | "instructor" | "learner"). Single
 * mapping used by me.ts and the login route — the implementation is
 * personaFor() in @microshala/contracts (backend-owned, single source).
 */
export { personaFor as portalRole } from "@microshala/contracts";
