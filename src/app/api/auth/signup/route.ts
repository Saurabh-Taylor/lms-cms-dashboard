import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";

/**
 * Access request, not self-registration: creates a non-privileged account with
 * status "invited". CMS sign-in stays admin-only until an existing admin
 * promotes the account — public signup can never grant admin access.
 */
export async function POST(req: Request) {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Name is required"),
      email: z.string().trim().email("Enter a valid email"),
    })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");

  const { name, email } = parsed.data;
  const existing = db.select().from(users).where(eq(users.email, email)).all()[0];
  if (!existing) {
    db.insert(users).values({
      name, email, role: "learner", status: "invited", createdAt: new Date(),
    }).run();
  }
  // same response either way — no account-existence disclosure
  return ok({ requested: true });
}
