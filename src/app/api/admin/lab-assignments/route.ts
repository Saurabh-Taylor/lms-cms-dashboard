import { and, count, eq, or, like, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, labAssignments, labs, users } from "@/lib/db/schema";
import { likePattern, listOk, listQuery, orderBy } from "@/lib/api/helpers";

const sortMap = {
  assignedAt: labAssignments.assignedAt,
  status: labAssignments.status,
  userName: users.name,
  labName: labs.name,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const userId = lq.sp.get("userId");
  if (userId) conds.push(eq(labAssignments.userId, Number(userId)));
  const labId = lq.sp.get("labId");
  if (labId) conds.push(eq(labAssignments.labId, Number(labId)));
  const status = lq.sp.get("status");
  if (status) conds.push(eq(labAssignments.status, status as "assigned"));
  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(users.name, p), like(labs.name, p))!);
  }
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: labAssignments.id,
        labId: labAssignments.labId,
        labName: labs.name,
        labType: labs.type,
        userId: labAssignments.userId,
        userName: users.name,
        courseId: labAssignments.courseId,
        courseTitle: courses.title,
        status: labAssignments.status,
        assignedAt: labAssignments.assignedAt,
        expiresAt: labAssignments.expiresAt,
      })
      .from(labAssignments)
      .innerJoin(labs, eq(labAssignments.labId, labs.id))
      .innerJoin(users, eq(labAssignments.userId, users.id))
      .leftJoin(courses, eq(labAssignments.courseId, courses.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "assignedAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(labAssignments)
      .innerJoin(labs, eq(labAssignments.labId, labs.id))
      .innerJoin(users, eq(labAssignments.userId, users.id))
      .where(where),
  ]);
  return listOk(rows, total, lq);
}
