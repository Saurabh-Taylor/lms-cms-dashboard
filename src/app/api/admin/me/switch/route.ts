import { z } from "zod";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { ADMIN_COOKIE, ROLE_COOKIE } from "@/lib/session";

/**
 * Demo identity switcher — stands in for login while the app has no auth.
 * Lets you prove per-admin preference isolation.
 */
export async function POST(req: Request) {
  const parsed = z.object({ userId: z.number().int().positive() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid userId");

  const row = db.select().from(users).where(eq(users.id, parsed.data.userId)).all()[0];
  if (!row || row.role !== "admin") return fail(404, "Admin not found");

  const store = await cookies();
  const opts = { path: "/", httpOnly: true, sameSite: "lax" } as const;
  store.set(ADMIN_COOKIE, String(row.id), opts);
  store.set(ROLE_COOKIE, row.role, opts);
  return ok({ switched: true, userId: row.id, name: row.name });
}
