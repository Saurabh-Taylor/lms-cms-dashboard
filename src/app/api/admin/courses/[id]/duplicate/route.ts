import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, lessons, sections } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/courses/[id]/duplicate">;

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const courseId = Number(id);
  const [src] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!src) return fail(404, "Course not found");

  const now = new Date();
  const [copy] = await db
    .insert(courses)
    .values({
      ...src,
      id: undefined,
      title: `${src.title} (Copy)`,
      slug: `${src.slug}-copy-${Date.now().toString(36)}`,
      status: "draft",
      enrollmentCount: 0,
      completionRate: 0,
      avgProgress: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const srcSections = await db
    .select()
    .from(sections)
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position));
  let lessonCount = 0;
  for (const sec of srcSections) {
    const [newSec] = await db
      .insert(sections)
      .values({ courseId: copy.id, title: sec.title, position: sec.position })
      .returning();
    const srcLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.sectionId, sec.id))
      .orderBy(asc(lessons.position));
    if (srcLessons.length) {
      await db.insert(lessons).values(
        srcLessons.map((l) => ({ ...l, id: undefined, sectionId: newSec.id }))
      );
      lessonCount += srcLessons.length;
    }
  }
  await db.update(courses).set({ lessonCount }).where(eq(courses.id, copy.id));

  audit({ action: "duplicated course", targetType: "course", targetId: copy.id, targetLabel: copy.title, module: "courses", details: { sourceId: courseId } });
  return ok(copy, { status: 201 });
}
