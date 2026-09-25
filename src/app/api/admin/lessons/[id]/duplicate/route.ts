import { eq, max } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/lessons/[id]/duplicate">;

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const [src] = await db.select().from(lessons).where(eq(lessons.id, Number(id)));
  if (!src) return fail(404, "Chapter not found");
  const [{ maxPos }] = await db
    .select({ maxPos: max(lessons.position) })
    .from(lessons)
    .where(eq(lessons.sectionId, src.sectionId));
  const [row] = await db
    .insert(lessons)
    .values({ ...src, id: undefined, title: `${src.title} (Copy)`, status: "draft", position: (maxPos ?? -1) + 1 })
    .returning();
  audit({ action: "duplicated chapter", targetType: "lesson", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok(row, { status: 201 });
}
