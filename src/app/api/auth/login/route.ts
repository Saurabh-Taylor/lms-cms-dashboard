import { z } from "zod";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { activityEvents, users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { ADMIN_COOKIE, ROLE_COOKIE, homeForRole } from "@/lib/session";

/**
 * Demo/dev credential seam — no real auth exists yet (users has no password
 * column). "admin"/"admin" (or any active user's email + "admin") signs in.
 * Disabled outside development unless ALLOW_DEMO_AUTH=1 is set explicitly.
 */
const DEMO_PASSWORD = "admin";

function demoAuthEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ALLOW_DEMO_AUTH === "1";
}

export async function POST(req: Request) {
  if (!demoAuthEnabled())
    return fail(503, "Demo authentication is disabled outside development");

  const parsed = z
    .object({ identifier: z.string().min(1), password: z.string().min(1) })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Username and password are required");

  const { identifier, password } = parsed.data;
  const id = identifier.trim().toLowerCase();
  const user = id === "admin"
    ? db.select().from(users).where(eq(users.role, "admin")).all()[0]
    : db.select().from(users).where(eq(users.email, id)).all()[0];

  // generic message — no account-existence disclosure; only active users sign in
  if (!user || user.status !== "active" || password !== DEMO_PASSWORD)
    return fail(401, "Invalid username or password");

  const store = await cookies();
  const opts = { path: "/", httpOnly: true, sameSite: "lax" } as const;
  store.set(ADMIN_COOKIE, String(user.id), opts);
  store.set(ROLE_COOKIE, user.role, opts);
  db.insert(activityEvents)
    .values({ userId: user.id, type: "logged_in", meta: "{}", createdAt: new Date() })
    .run();
  return ok({ signedIn: true, name: user.name, role: user.role, redirectTo: homeForRole(user.role) });
}
