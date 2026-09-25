import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/categories/[id]">;

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid payload");
  const [row] = await db.update(categories).set(parsed.data).where(eq(categories.id, Number(id))).returning();
  if (!row) return fail(404, "Category not found");
  audit({ action: "updated category", targetType: "category", targetId: row.id, targetLabel: row.name, module: "categories" });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(categories).where(eq(categories.id, Number(id))).returning();
  if (!row) return fail(404, "Category not found");
  audit({ action: "deleted category", targetType: "category", targetId: row.id, targetLabel: row.name, module: "categories" });
  return ok({ deleted: true });
}
