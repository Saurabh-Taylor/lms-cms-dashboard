import { eq, gte, lte } from "drizzle-orm";
import { activityEvents, courses, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.activityView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: activityEvents,
    select: {
      id: activityEvents.id,
      userId: activityEvents.userId,
      userName: users.name,
      type: activityEvents.type,
      courseId: activityEvents.courseId,
      courseTitle: courses.title,
      meta: activityEvents.meta,
      createdAt: activityEvents.createdAt,
    },
    join: (q) =>
      q
        .innerJoin(users, eq(activityEvents.userId, users.id))
        .leftJoin(courses, eq(activityEvents.courseId, courses.id)),
    filters: (c, lq) => {
      const userId = lq.sp.get("userId");
      if (userId) c.push(eq(activityEvents.userId, Number(userId)));
      const type = lq.sp.get("type");
      if (type) c.push(eq(activityEvents.type, type));
      const courseId = lq.sp.get("courseId");
      if (courseId) c.push(eq(activityEvents.courseId, Number(courseId)));
      const from = lq.sp.get("from");
      if (from) c.push(gte(activityEvents.createdAt, new Date(Number(from))));
      const range = lq.sp.get("range");
      if (range) c.push(gte(activityEvents.createdAt, new Date(Date.now() - Number(range) * 86400000)));
      const to = lq.sp.get("to");
      if (to) c.push(lte(activityEvents.createdAt, new Date(Number(to))));
    },
    search: [users.name],
    sortMap: {
      createdAt: activityEvents.createdAt,
      type: activityEvents.type,
      userName: users.name,
    },
    defaultSort: "createdAt",
  });
}
