import { and, count, eq, or, like, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { certificates, courses, enrollments, users } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  issuedAt: certificates.issuedAt,
  serial: certificates.serial,
  userName: users.name,
  courseTitle: courses.title,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const userId = lq.sp.get("userId");
  if (userId) conds.push(eq(certificates.userId, Number(userId)));
  const courseId = lq.sp.get("courseId");
  if (courseId) conds.push(eq(certificates.courseId, Number(courseId)));
  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(users.name, p), like(courses.title, p), like(certificates.serial, p))!);
  }
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: certificates.id, serial: certificates.serial,
        userId: certificates.userId, userName: users.name,
        courseId: certificates.courseId, courseTitle: courses.title,
        issuedAt: certificates.issuedAt,
      })
      .from(certificates)
      .innerJoin(users, eq(certificates.userId, users.id))
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "issuedAt"))
      .limit(lq.pageSize).offset(lq.offset),
    db.select({ total: count() }).from(certificates)
      .innerJoin(users, eq(certificates.userId, users.id))
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(where),
  ]);
  return listOk(rows, total, lq);
}

// Issue a certificate — only for completed enrollments without an existing cert.
const schema = z.object({
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Provide userId and courseId");
  const { userId, courseId } = parsed.data;

  const [enr] = await db.select().from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
  if (!enr || enr.status !== "completed")
    return fail(409, "Learner has not completed this course");

  const dup = await db.select({ id: certificates.id }).from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)));
  if (dup.length) return fail(409, "Certificate already issued");

  const serial = `CERT-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db.insert(certificates)
    .values({ serial, userId, courseId, issuedAt: new Date() }).returning();
  audit({ action: "issued certificate", targetType: "certificate", targetId: row.id, targetLabel: serial, module: "certificates" });
  return ok(row, { status: 201 });
}
