import { cache } from "react";
import { apiServer } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";
import { homeForRole, SESSION_COOKIE } from "@/lib/session";
import type { Perm } from "@/lib/permissions";
import type { UiPreferences } from "@/lib/ui-preferences";

export { SESSION_COOKIE, homeForRole };

export interface SessionUser {
  /** Postgres users.id — the Better Auth account id (single users table backend-side). */
  id: number;
  name: string;
  email: string;
  /** Portal role: "admin" | "instructor" | "learner" — drives layouts/gating. */
  role: string;
  /** Backend application role (super_admin|admin|instructor|content_manager|support|learner). */
  appRole: string;
  /** Capability keys resolved server-side from role_permissions — the one source of truth. */
  permissions: string[];
  /** Persona being previewed ("learner"|"instructor") — only admins can set it; null otherwise. */
  previewing: string | null;
  uiPreferences: UiPreferences;
}

export type CurrentAdmin = SessionUser;
export type CurrentLearner = SessionUser;

/** Shape returned by the backend GET /v1/me (identity + resolved RBAC). */
interface MeResponse {
  id: number;
  email: string;
  name: string;
  appRole: string;
  persona: string;
  previewing: string | null;
  status: string;
  title?: string | null;
  permissions: string[];
  uiPreferences: UiPreferences | null;
}

/**
 * Session resolution — validates the Better Auth session cookie against the
 * backend's /v1/me (identity + persona + permissions + preferences in one
 * call). Returns null for missing/suspended sessions. Cached per request
 * (React cache) — layouts and route handlers can call it freely without extra
 * API round-trips.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  let auth: MeResponse | null;
  try {
    auth = await apiServer<MeResponse | null>("/api/v1/me");
  } catch {
    return null; // 401/no session or API unreachable → unauthenticated
  }
  if (!auth || auth.status !== "active") return null;

  return {
    id: auth.id,
    name: auth.name,
    email: auth.email,
    role: auth.persona,
    appRole: auth.appRole,
    permissions: auth.permissions ?? [],
    previewing: auth.previewing ?? null,
    uiPreferences: auth.uiPreferences ?? {},
  };
});

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const u = await getCurrentUser();
  return u?.role === "admin" ? u : null;
}

/** Learner portal identity — learners and instructors consume learning content. */
export async function getCurrentLearner(): Promise<CurrentLearner | null> {
  const u = await getCurrentUser();
  return u && (u.role === "learner" || u.role === "instructor") ? u : null;
}

/**
 * Route-level auth seam — the one check every protected handler runs. Returns
 * the SessionUser on success or a ready-to-return Response (401 no session,
 * 403 wrong persona), matching the backend's SessionGuard/PermissionsGuard
 * semantics. Usage: `const me = await requireAdmin(); if (me instanceof Response) return me;`
 */
export async function requireUser(personas: string[]): Promise<SessionUser | Response> {
  const me = await getCurrentUser();
  if (!me) return fail(401, "Not signed in");
  if (!personas.includes(me.role)) return fail(403, "Forbidden");
  return me;
}

export function requireAdmin(): Promise<CurrentAdmin | Response> {
  return requireUser(["admin"]);
}

/**
 * Capability gate for admin-portal routes — persona AND permissions, matching
 * the backend's RequirePermissions (all-of semantics). `requireAdmin()` alone
 * only proves the caller is staff; every appRole with admin-portal access
 * would otherwise reach every admin endpoint. Use `requireAdmin()` only for
 * routes serving data every staff member legitimately needs (session, profile,
 * picker options, global search).
 */
export async function requirePermission(...perms: Perm[]): Promise<CurrentAdmin | Response> {
  const me = await requireAdmin();
  if (me instanceof Response) return me;
  if (!perms.every((p) => me.permissions.includes(p))) return fail(403, "Forbidden");
  return me;
}

export function requireLearner(): Promise<CurrentLearner | Response> {
  return requireUser(["learner", "instructor"]);
}
