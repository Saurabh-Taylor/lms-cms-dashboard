import { and, count, eq, gte, lte, like, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activityEvents, courses, users } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy } from "@/lib/api/helpers";

export const ACTIVITY_TYPES = [
  "logged_in", "course_opened", "chapter_completed", "lab_started",
  "lab_completed", "assignment_submitted", "quiz_completed",
  "resource_downloaded", "certificate_viewed",
] as const;

const sortMap = {
  createdAt: activityEvents.createdAt,
  type: activityEvents.type,
  userName: users.name,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const userId = lq.sp.get("userId");
  if (userId) conds.push(eq(activityEvents.userId, Number(userId)));
  const type = lq.sp.get("type");
  if (type) conds.push(eq(activityEvents.type, type));
  const courseId = lq.sp.get("courseId");
  if (courseId) conds.push(eq(activityEvents.courseId, Number(courseId)));
  const from = lq.sp.get("from");
  if (from) conds.push(gte(activityEvents.createdAt, new Date(Number(from))));
  const range = lq.sp.get("range");
  if (range) conds.push(gte(activityEvents.createdAt, new Date(Date.now() - Number(range) * 86400000)));
  const to = lq.sp.get("to");
  if (to) conds.push(lte(activityEvents.createdAt, new Date(Number(to))));
  if (lq.q) conds.push(like(users.name, likePattern(lq.q)));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: activityEvents.id,
        userId: activityEvents.userId,
        userName: users.name,
        type: activityEvents.type,
        courseId: activityEvents.courseId,
        courseTitle: courses.title,
        meta: activityEvents.meta,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .innerJoin(users, eq(activityEvents.userId, users.id))
      .leftJoin(courses, eq(activityEvents.courseId, courses.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "createdAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(activityEvents)
      .innerJoin(users, eq(activityEvents.userId, users.id))
      .where(where),
  ]);
  return listOk(rows, total, lq);
}
