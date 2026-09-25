import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { sections } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/sections/[id]">;

const patchSchema = z.object({ title: z.string().min(1).max(200) });

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Title required");
  const [row] = await db.update(sections).set(parsed.data).where(eq(sections.id, Number(id))).returning();
  if (!row) return fail(404, "Section not found");
  audit({ action: "renamed section", targetType: "section", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(sections).where(eq(sections.id, Number(id))).returning();
  if (!row) return fail(404, "Section not found");
  audit({ action: "deleted section", targetType: "section", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok({ deleted: true });
}
