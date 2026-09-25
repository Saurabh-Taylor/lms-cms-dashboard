import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, labs } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/labs/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db
    .select({ lab: labs, categoryName: categories.name })
    .from(labs)
    .leftJoin(categories, eq(labs.categoryId, categories.id))
    .where(eq(labs.id, Number(id)));
  if (!row) return fail(404, "Lab not found");
  return ok({ ...row.lab, categoryName: row.categoryName });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(["vm", "container", "jupyter", "cloud-sandbox"]).optional(),
  categoryId: z.number().int().positive().nullish(),
  description: z.string().max(2000).nullish(),
  durationMin: z.number().int().min(5).optional(),
  resourceTier: z.enum(["small", "medium", "large"]).optional(),
  status: z.enum(["active", "disabled", "archived"]).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid lab payload");
  const [row] = await db.update(labs).set(parsed.data).where(eq(labs.id, Number(id))).returning();
  if (!row) return fail(404, "Lab not found");
  const action = parsed.data.status === "disabled" ? "disabled lab"
    : parsed.data.status === "archived" ? "archived lab"
    : parsed.data.status === "active" ? "activated lab" : "updated lab";
  audit({ action, targetType: "lab", targetId: row.id, targetLabel: row.name, module: "labs" });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(labs).where(eq(labs.id, Number(id))).returning();
  if (!row) return fail(404, "Lab not found");
  audit({ action: "deleted lab", targetType: "lab", targetId: row.id, targetLabel: row.name, module: "labs" });
  return ok({ deleted: true });
}
