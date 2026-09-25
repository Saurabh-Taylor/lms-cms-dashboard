import { and, count, eq, gte, inArray, like, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, enrollments, users } from "@/lib/db/schema";
import { fail, likePattern, listOk, listQuery, ok, orderBy } from "@/lib/api/helpers";
import { audit } from "@/lib/api/audit";

const sortMap = {
  enrolledAt: enrollments.enrolledAt,
  progress: enrollments.progress,
  status: enrollments.status,
  expiresAt: enrollments.expiresAt,
  userName: users.name,
  courseTitle: courses.title,
} as const;

export async function GET(req: Request) {
  const lq = listQuery(req);
  const conds: SQL[] = [];
  const status = lq.sp.get("status");
  if (status) conds.push(eq(enrollments.status, status as "active"));
  const userId = lq.sp.get("userId");
  if (userId) conds.push(eq(enrollments.userId, Number(userId)));
  const courseId = lq.sp.get("courseId");
  if (courseId) conds.push(eq(enrollments.courseId, Number(courseId)));
  const from = lq.sp.get("enrolledFrom");
  if (from) conds.push(gte(enrollments.enrolledAt, new Date(Number(from))));
  const to = lq.sp.get("enrolledTo");
  if (to) conds.push(lte(enrollments.enrolledAt, new Date(Number(to))));
  if (lq.q) {
    const p = likePattern(lq.q);
    conds.push(or(like(users.name, p), like(courses.title, p), like(users.email, p))!);
  }
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
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
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(where)
      .orderBy(orderBy(sortMap, lq.sort, lq.order, "enrolledAt"))
      .limit(lq.pageSize)
      .offset(lq.offset),
    db
      .select({ total: count() })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(where),
  ]);
  return listOk(rows, total, lq);
}

// POST supports single ({ userId, courseId }) and bulk ({ userIds, courseIds }).
// Returns per-item results so the UI can report partial failures.
const postSchema = z.object({
  userId: z.number().int().positive().optional(),
  userIds: z.array(z.number().int().positive()).max(5000).optional(),
  courseId: z.number().int().positive().optional(),
  courseIds: z.array(z.number().int().positive()).max(500).optional(),
  expiresAt: z.number().int().nullish(),
});

export async function POST(req: Request) {
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid enrollment payload");
  const { userId, userIds, courseId, courseIds, expiresAt } = parsed.data;
  const uids = [...new Set([...(userIds ?? []), ...(userId ? [userId] : [])])];
  const cids = [...new Set([...(courseIds ?? []), ...(courseId ? [courseId] : [])])];
  if (!uids.length || !cids.length) return fail(400, "Provide user(s) and course(s)");

  const validUsers = new Set(
    (await db.select({ id: users.id }).from(users).where(and(inArray(users.id, uids), eq(users.status, "active")))).map((r) => r.id)
  );
  const validCourses = new Set(
    (await db.select({ id: courses.id }).from(courses).where(inArray(courses.id, cids))).map((r) => r.id)
  );

  const results: { userId: number; courseId: number; ok: boolean; reason?: string }[] = [];
  const now = new Date();
  const expiry = expiresAt ? new Date(expiresAt) : null;

  // better-sqlite3 transactions are synchronous — use .all()/.run(), no await inside
  db.transaction((tx) => {
    for (const uid of uids) {
      for (const cid of cids) {
        if (!validUsers.has(uid)) {
          results.push({ userId: uid, courseId: cid, ok: false, reason: "User not found or inactive" });
          continue;
        }
        if (!validCourses.has(cid)) {
          results.push({ userId: uid, courseId: cid, ok: false, reason: "Course not found" });
          continue;
        }
        const existing = tx
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(and(eq(enrollments.userId, uid), eq(enrollments.courseId, cid)))
          .all();
        if (existing.length) {
          results.push({ userId: uid, courseId: cid, ok: false, reason: "Already enrolled" });
          continue;
        }
        tx.insert(enrollments)
          .values({ userId: uid, courseId: cid, status: "active", progress: 0, enrolledAt: now, expiresAt: expiry })
          .run();
        results.push({ userId: uid, courseId: cid, ok: true });
      }
    }
    // refresh denormalized counters
    for (const cid of cids) {
      tx.run(sql`UPDATE courses SET
        enrollment_count = (SELECT COUNT(*) FROM enrollments WHERE course_id = ${cid}),
        avg_progress = COALESCE((SELECT CAST(AVG(progress) AS INT) FROM enrollments WHERE course_id = ${cid}), 0)
        WHERE id = ${cid}`);
    }
    for (const uid of uids) {
      tx.run(sql`UPDATE users SET
        enrolled_count = (SELECT COUNT(*) FROM enrollments WHERE user_id = ${uid}),
        avg_progress = COALESCE((SELECT CAST(AVG(progress) AS INT) FROM enrollments WHERE user_id = ${uid}), 0)
        WHERE id = ${uid}`);
    }
  });

  const succeeded = results.filter((r) => r.ok).length;
  if (succeeded) {
    const label = uids.length === 1 && cids.length === 1
      ? `user ${uids[0]} → course ${cids[0]}`
      : `${succeeded} enrollment(s)`;
    audit({
      action: succeeded > 1 ? "bulk enrolled learners" : "enrolled learner in course",
      targetType: "enrollment",
      targetLabel: label,
      module: "enrollments",
      details: { requested: uids.length * cids.length, succeeded, failed: results.length - succeeded },
    });
  }
  return ok({ results, succeeded, failed: results.length - succeeded }, { status: 201 });
}

// Bulk status update: { ids, action: "suspend" | "reactivate" | "expire" | "delete" }
const bulkSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(5000),
  action: z.enum(["suspend", "reactivate", "expire", "delete"]),
});

export async function PATCH(req: Request) {
  const parsed = bulkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Invalid bulk payload");
  const { ids, action } = parsed.data;

  if (action === "delete") {
    await db.delete(enrollments).where(inArray(enrollments.id, ids));
  } else {
    const status = action === "suspend" ? "suspended" : action === "expire" ? "expired" : "active";
    await db.update(enrollments).set({ status }).where(inArray(enrollments.id, ids));
  }
  audit({ action: `${action}d ${ids.length} enrollment(s)`, targetType: "enrollment", targetLabel: `${ids.length} rows`, module: "enrollments" });
  return ok({ updated: ids.length });
}
