import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/users/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(users).where(eq(users.id, Number(id)));
  if (!row) return fail(404, "User not found");
  return ok(row);
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  title: z.string().max(120).nullish(),
  status: z.enum(["active", "suspended", "invited"]).optional(),
  role: z.enum(["learner", "instructor", "admin"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid body");
  const [row] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, Number(id)))
    .returning();
  if (!row) return fail(404, "User not found");
  if (parsed.data.status === "suspended")
    audit({ action: "suspended learner", targetType: "learner", targetId: row.id, targetLabel: row.name, module: "learners" });
  else if (parsed.data.status === "active")
    audit({ action: "reactivated learner", targetType: "learner", targetId: row.id, targetLabel: row.name, module: "learners" });
  else
    audit({ action: "updated user", targetType: "user", targetId: row.id, targetLabel: row.name, module: "learners", details: { changes: parsed.data } });
  return ok(row);
}
