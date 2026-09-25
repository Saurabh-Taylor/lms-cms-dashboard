import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, lessons, sections } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

type Ctx = RouteContext<"/api/admin/courses/[id]/curriculum">;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const courseId = Number(id);
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return fail(404, "Course not found");

  const secs = await db
    .select()
    .from(sections)
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position));
  const allLessons = secs.length
    ? await db
        .select()
        .from(lessons)
        .innerJoin(sections, eq(lessons.sectionId, sections.id))
        .where(eq(sections.courseId, courseId))
        .orderBy(asc(lessons.position))
    : [];

  const tree = secs.map((sec) => ({
    ...sec,
    lessons: allLessons
      .filter((l) => l.lessons.sectionId === sec.id)
      .map((l) => l.lessons),
  }));
  return ok({ course, sections: tree });
}

// Bulk reorder / move. Body: { sections: [{ id, position, lessons: [{ id, position }] }] }
const putSchema = z.object({
  sections: z.array(
    z.object({
      id: z.number().int(),
      position: z.number().int(),
      lessons: z.array(z.object({ id: z.number().int(), position: z.number().int() })),
    })
  ),
});

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const courseId = Number(id);
  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid curriculum payload");

  const courseSections = new Set(
    (await db.select({ id: sections.id }).from(sections).where(eq(sections.courseId, courseId))).map((r) => r.id)
  );

  db.transaction((tx) => {
    for (const sec of parsed.data.sections) {
      if (!courseSections.has(sec.id)) continue; // ignore foreign ids
      tx.update(sections).set({ position: sec.position }).where(eq(sections.id, sec.id)).run();
      for (const les of sec.lessons) {
        tx.update(lessons)
          .set({ sectionId: sec.id, position: les.position })
          .where(eq(lessons.id, les.id))
          .run();
      }
    }
  });
  audit({ action: "reordered curriculum", targetType: "course", targetId: courseId, targetLabel: String(courseId), module: "courses" });
  return ok({ updated: true });
}
