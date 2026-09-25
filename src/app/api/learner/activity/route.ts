import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activityEvents, enrollments, users } from "@/lib/db/schema";
import { fail, ok } from "@/lib/api/helpers";
import { getCurrentLearner } from "@/lib/me";

const ALLOWED = new Set(["logged_in", "course_opened", "lesson_viewed", "resource_downloaded"]);

/** Records a learner activity event (powers continue-learning ordering). */
export async function POST(req: Request) {
  const me = await getCurrentLearner();
  if (!me) return fail(401, "Not signed in");

  const parsed = z
    .object({ type: z.string(), courseId: z.number().int().positive().optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !ALLOWED.has(parsed.data.type))
    return fail(400, "Invalid activity event");

  const { type, courseId } = parsed.data;
  if (courseId != null) {
    const enr = db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, me.id), eq(enrollments.courseId, courseId)))
      .all()[0];
    if (!enr) return fail(403, "Not enrolled in this course");
  }

  db.insert(activityEvents)
    .values({ userId: me.id, type, courseId: courseId ?? null, meta: "{}", createdAt: new Date() })
    .run();
  db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, me.id)).run();
  return ok({ recorded: true });
}
