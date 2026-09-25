import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { lessons, sections } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/sections/[id]/lessons">;

const schema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["text", "video", "pdf", "link", "code", "quiz", "lab", "assignment"]).default("text"),
});

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sectionId = Number(id);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid lesson payload");

  const [sec] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!sec) return fail(404, "Section not found");

  const [{ max: maxPos }] = await db.select({ max: max(lessons.position) }).from(lessons).where(eq(lessons.sectionId, sectionId));
  const [row] = await db
    .insert(lessons)
    .values({ sectionId, title: parsed.data.title, type: parsed.data.type, position: (maxPos ?? -1) + 1, status: "draft", blocks: "[]" })
    .returning();
  audit({ action: "created chapter", targetType: "lesson", targetId: row.id, targetLabel: row.title, module: "courses", details: { courseId: sec.courseId } });
  return ok(row, { status: 201 });
}
