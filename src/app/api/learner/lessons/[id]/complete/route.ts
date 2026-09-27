import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { enrollments, lessonProgress, lessons, sections } from "@/lib/db/schema";
import { lessonCompleted, lessonUncompleted } from "@/lib/db/derived";
import { fail, ok } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";

/** Resolve lesson + the caller's enrollment in its course. */
function context(userId: number, lessonId: number) {
  const lesson = db
    .select({ id: lessons.id, courseId: sections.courseId })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(and(eq(lessons.id, lessonId), eq(lessons.status, "published")))
    .all()[0];
  if (!lesson) return null;
  const enrollment = db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, lesson.courseId)))
    .all()[0];
  if (!enrollment) return null;
  return { lesson, enrollment };
}

async function parse(ctx: RouteContext<"/api/learner/lessons/[id]/complete">) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) ? id : null;
}

/** Mark a lesson complete (idempotent) — the op owns all derived consequences. */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/learner/lessons/[id]/complete">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const lessonId = await parse(ctx);
  if (lessonId == null) return fail(400, "Invalid lesson id");

  const found = context(me.id, lessonId);
  if (!found) return fail(404, "Lesson not found or not enrolled");

  const progress = db.transaction((tx) => {
    const ins = tx
      .insert(lessonProgress)
      .values({
        enrollmentId: found.enrollment.id,
        lessonId,
        completedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
    return lessonCompleted(tx, {
      enrollmentId: found.enrollment.id,
      userId: me.id,
      courseId: found.lesson.courseId,
      lessonId,
      changed: ins.changes > 0,
    });
  });
  return ok(progress);
}

/** Unmark a lesson (redo) — drops progress back honestly. */
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/learner/lessons/[id]/complete">
) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const lessonId = await parse(ctx);
  if (lessonId == null) return fail(400, "Invalid lesson id");

  const found = context(me.id, lessonId);
  if (!found) return fail(404, "Lesson not found or not enrolled");

  const progress = db.transaction((tx) => {
    tx.delete(lessonProgress)
      .where(
        and(
          eq(lessonProgress.enrollmentId, found.enrollment.id),
          eq(lessonProgress.lessonId, lessonId)
        )
      )
      .run();
    return lessonUncompleted(tx, {
      enrollmentId: found.enrollment.id,
      userId: me.id,
      courseId: found.lesson.courseId,
    });
  });
  return ok(progress);
}
