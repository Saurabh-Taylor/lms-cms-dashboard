import { eq, gte, lte, sql } from "drizzle-orm";
import { groupMembers, users } from "@/lib/db/schema";
import { fail } from "@/lib/api/helpers";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/users";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.learnerView);
  if (me instanceof Response) return me;
  // Listing the administrators themselves is a separate capability.
  if (new URL(req.url).searchParams.get("role") === "admin" && !me.permissions.includes(PERM.adminView))
    return fail(403, "Forbidden");
  return adminList(req, {
    from: users,
    filters: (c, lq) => {
      const role = lq.sp.get("role");
      if (role) c.push(eq(users.role, role as "learner" | "instructor" | "admin"));
      const status = lq.sp.get("status");
      if (status) c.push(eq(users.status, status as "active" | "suspended" | "invited"));

      const cohort = lq.sp.get("cohortId");
      if (cohort)
        c.push(
          sql`${users.id} IN (SELECT user_id FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${Number(cohort)})`
        );

      const from = lq.sp.get("createdFrom");
      if (from) c.push(gte(users.createdAt, new Date(Number(from))));
      const to = lq.sp.get("createdTo");
      if (to) c.push(lte(users.createdAt, new Date(Number(to))));

      const activeWithin = lq.sp.get("activeWithinDays");
      if (activeWithin)
        c.push(gte(users.lastActiveAt, new Date(Date.now() - Number(activeWithin) * 86400000)));

      const courseId = lq.sp.get("courseId");
      if (courseId)
        c.push(
          sql`${users.id} IN (SELECT user_id FROM enrollments WHERE course_id = ${Number(courseId)})`
        );
    },
    search: [users.name, users.email],
    sortMap: {
      name: users.name,
      email: users.email,
      status: users.status,
      enrolledCount: users.enrolledCount,
      avgProgress: users.avgProgress,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    },
    defaultSort: "createdAt",
  });
}

export const POST = verb<"/api/admin/users">(PERM.learnerCreate, write.create);
