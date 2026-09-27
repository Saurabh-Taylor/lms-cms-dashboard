import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { apiServer } from "@/lib/api-server";
import { fail } from "@/lib/api/helpers";
import { homeForRole, SESSION_COOKIE } from "@/lib/session";
import type { Perm } from "@/lib/permissions";
import type { UiPreferences } from "@/lib/ui-preferences";

export { SESSION_COOKIE, homeForRole };

export interface SessionUser {
  /** Local users.id — bridged from the auth account via users.authUserId (always real: the row is created on first sign-in when missing). */
  id: number;
  name: string;
  email: string;
  /** Portal role: "admin" | "instructor" | "learner" — drives layouts/gating. */
  role: string;
  /** Backend application role (super_admin|admin|instructor|content_manager|support|learner). */
  appRole: string;
  /** Capability keys resolved server-side from role_permissions — the one source of truth. */
  permissions: string[];
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
  status: string;
  title?: string | null;
  permissions: string[];
}

/**
 * Session resolution — validates the Better Auth session cookie against the
 * backend's /v1/me (identity + persona + permissions in one call), then bridges
 * to the local users row via authUserId (falling back to email once and
 * lazy-linking). A valid session with no local row gets one created on the
 * spot — a signable account is a user, and me.id must never be a phantom
 * foreign key. The local row's persona/status/name/title self-heal on every
 * resolution so the display columns can't drift from backend-side changes.
 * Returns null for missing/suspended sessions. Cached per request (React
 * cache) — layouts and route handlers can call it freely without extra API
 * round-trips.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  let auth: MeResponse | null;
  try {
    auth = await apiServer<MeResponse | null>("/api/v1/me");
  } catch {
    return null; // 401/no session or API unreachable → unauthenticated
  }
  if (!auth || auth.status !== "active") return null;

  const role = auth.persona;

  // Bridge to the local CMS row: authUserId hit → email hit + lazy-link → create.
  let local = db.select().from(users).where(eq(users.authUserId, auth.id)).all()[0];
  if (!local) {
    const byEmail = db.select().from(users).where(eq(users.email, auth.email)).all()[0];
    if (byEmail) {
      if (byEmail.authUserId !== auth.id)
        db.update(users).set({ authUserId: auth.id }).where(eq(users.id, byEmail.id)).run();
      local = { ...byEmail, authUserId: auth.id };
    } else {
      try {
        local = db.insert(users).values({
          authUserId: auth.id,
          name: auth.name,
          email: auth.email,
          role: role as "admin" | "instructor" | "learner",
          status: auth.status as "active" | "suspended" | "invited",
          title: auth.title ?? null,
          createdAt: new Date(),
        }).returning().all()[0];
      } catch {
        // Concurrent first-sign-in race — the other request already created it.
        local = db.select().from(users).where(eq(users.authUserId, auth.id)).all()[0];
      }
    }
  }
  if (!local) return null;

  // The local persona/status/name/title columns are a maintained projection of
  // the auth account — resync when the backend is the one that changed.
  const synced = {
    role: role as "admin" | "instructor" | "learner",
    status: auth.status as "active" | "suspended" | "invited",
    name: auth.name,
    title: auth.title ?? null,
  };
  if (
    local.role !== synced.role ||
    local.status !== synced.status ||
    local.name !== synced.name ||
    (local.title ?? null) !== synced.title
  ) {
    db.update(users).set(synced).where(eq(users.id, local.id)).run();
    local = { ...local, ...synced };
  }

  let uiPreferences: UiPreferences = {};
  if (local.uiPreferences) {
    try { uiPreferences = JSON.parse(local.uiPreferences); } catch { /* corrupted → defaults */ }
  }

  return {
    id: local.id,
    name: auth.name,
    email: auth.email,
    role,
    appRole: auth.appRole,
    permissions: auth.permissions ?? [],
    uiPreferences,
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
