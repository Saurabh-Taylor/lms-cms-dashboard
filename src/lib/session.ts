// Cookie names shared by middleware (edge-safe) and server code. Kept separate
// from lib/me.ts so middleware doesn't pull in the DB client.
export const ADMIN_COOKIE = "lh_admin_id";

// Mirrors the signed-in role so middleware can gate portal APIs without a DB
// hit. Demo seam only — not signed; layouts/routes still validate server-side.
export const ROLE_COOKIE = "lh_role";

/** Where each role lands after sign-in / when visiting a foreign portal. */
export function homeForRole(role: string): string {
  return role === "admin" ? "/admin/dashboard" : "/learner/dashboard";
}
