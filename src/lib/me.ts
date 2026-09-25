import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ADMIN_COOKIE, homeForRole } from "@/lib/session";
import type { UiPreferences } from "@/lib/ui-preferences";

export { ADMIN_COOKIE, homeForRole };

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  uiPreferences: UiPreferences;
}

export type CurrentAdmin = SessionUser;
export type CurrentLearner = SessionUser;

/**
 * Session resolution — the lh_admin_id cookie is the demo session seam standing
 * in for real auth. Returns null when there is no cookie, it doesn't map to a
 * user, or the user isn't active; there is intentionally no fallback so
 * unauthenticated visitors get gated to /login.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  if (!Number.isInteger(id)) return null;

  const row = db.select().from(users).where(eq(users.id, id)).all()[0];
  if (!row || row.status !== "active") return null;

  let uiPreferences: UiPreferences = {};
  if (row.uiPreferences) {
    try { uiPreferences = JSON.parse(row.uiPreferences); } catch { /* corrupted prefs → defaults */ }
  }

  return { id: row.id, name: row.name, email: row.email, role: row.role, uiPreferences };
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const u = await getCurrentUser();
  return u?.role === "admin" ? u : null;
}

/** Learner portal identity — learners and instructors consume learning content. */
export async function getCurrentLearner(): Promise<CurrentLearner | null> {
  const u = await getCurrentUser();
  return u && (u.role === "learner" || u.role === "instructor") ? u : null;
}
