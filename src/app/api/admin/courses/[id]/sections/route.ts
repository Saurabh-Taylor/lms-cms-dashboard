import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, sections } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/courses/[id]/sections">;

const schema = z.object({ title: z.string().min(1).max(200) });

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const courseId = Number(id);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Title required");

  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId));
  if (!course) return fail(404, "Course not found");

  const [{ maxPos }] = await db
    .select({ maxPos: max(sections.position) })
    .from(sections)
    .where(eq(sections.courseId, courseId));
  const [row] = await db
    .insert(sections)
    .values({ courseId, title: parsed.data.title, position: (maxPos ?? -1) + 1 })
    .returning();
  audit({ action: "created section", targetType: "section", targetId: row.id, targetLabel: row.title, module: "courses" });
  return ok({ ...row, lessons: [] }, { status: 201 });
}
