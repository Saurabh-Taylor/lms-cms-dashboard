import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/lessons/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(lessons).where(eq(lessons.id, Number(id)));
  if (!row) return fail(404, "Chapter not found");
  return ok(row);
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(["text", "video", "pdf", "link", "code", "quiz", "lab", "assignment"]).optional(),
  durationMin: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published"]).optional(),
  blocks: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid chapter payload");
  const { blocks, ...rest } = parsed.data;
  const [row] = await db
    .update(lessons)
    .set({ ...rest, ...(blocks ? { blocks: JSON.stringify(blocks) } : {}) })
    .where(eq(lessons.id, Number(id)))
    .returning();
  if (!row) return fail(404, "Chapter not found");
  audit({ action: "updated chapter", targetType: "lesson", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [row] = await db.delete(lessons).where(eq(lessons.id, Number(id))).returning();
  if (!row) return fail(404, "Chapter not found");
  audit({ action: "deleted chapter", targetType: "lesson", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok({ deleted: true });
}
