import { eq, gte, lte } from "drizzle-orm";
import { courses, enrollments, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/enrollments";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.enrollmentView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: enrollments,
    select: {
      id: enrollments.id,
      userId: enrollments.userId,
      userName: users.name,
      userEmail: users.email,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      status: enrollments.status,
      progress: enrollments.progress,
      enrolledAt: enrollments.enrolledAt,
      expiresAt: enrollments.expiresAt,
      completedAt: enrollments.completedAt,
    },
    join: (q) =>
      q
        .innerJoin(users, eq(enrollments.userId, users.id))
        .innerJoin(courses, eq(enrollments.courseId, courses.id)),
    filters: (c, lq) => {
      const status = lq.sp.get("status");
      if (status) c.push(eq(enrollments.status, status as "active"));
      const userId = lq.sp.get("userId");
      if (userId) c.push(eq(enrollments.userId, Number(userId)));
      const courseId = lq.sp.get("courseId");
      if (courseId) c.push(eq(enrollments.courseId, Number(courseId)));
      const from = lq.sp.get("enrolledFrom");
      if (from) c.push(gte(enrollments.enrolledAt, new Date(Number(from))));
      const to = lq.sp.get("enrolledTo");
      if (to) c.push(lte(enrollments.enrolledAt, new Date(Number(to))));
    },
    search: [users.name, courses.title, users.email],
    sortMap: {
      enrolledAt: enrollments.enrolledAt,
      progress: enrollments.progress,
      status: enrollments.status,
      expiresAt: enrollments.expiresAt,
      userName: users.name,
      courseTitle: courses.title,
    },
    defaultSort: "enrolledAt",
  });
}

export const POST = verb<"/api/admin/enrollments">(PERM.enrollmentCreate, write.create);
export const PATCH = verb<"/api/admin/enrollments">(PERM.enrollmentUpdate, write.bulk);
