import { eq } from "drizzle-orm";
import { certificates, courses, users } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/certificates";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.certificateView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: certificates,
    select: {
      id: certificates.id, serial: certificates.serial,
      userId: certificates.userId, userName: users.name,
      courseId: certificates.courseId, courseTitle: courses.title,
      issuedAt: certificates.issuedAt,
    },
    join: (q) =>
      q
        .innerJoin(users, eq(certificates.userId, users.id))
        .innerJoin(courses, eq(certificates.courseId, courses.id)),
    filters: (c, lq) => {
      const userId = lq.sp.get("userId");
      if (userId) c.push(eq(certificates.userId, Number(userId)));
      const courseId = lq.sp.get("courseId");
      if (courseId) c.push(eq(certificates.courseId, Number(courseId)));
    },
    search: [users.name, courses.title, certificates.serial],
    sortMap: {
      issuedAt: certificates.issuedAt,
      serial: certificates.serial,
      userName: users.name,
      courseTitle: courses.title,
    },
    defaultSort: "issuedAt",
  });
}

export const POST = verb<"/api/admin/certificates">(PERM.certificateIssue, write.create);
