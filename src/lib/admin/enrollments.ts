// Enrollments write module — bulk ops keep partial-failure semantics:
// per-item results are PAYLOAD, not errors. See lib/admin/lessons.ts.
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { courses, enrollments, users } from "@/lib/db/schema";
import { refreshCourseCounters, refreshUserCounters } from "@/lib/db/aggregates";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, type Actor } from "@/lib/domain";

const A = {
  single: "enrolled learner in course",
  bulk: "bulk enrolled learners",
} as const;

export const create = z.object({
  userId: z.number().int().positive().optional(),
  userIds: z.array(z.number().int().positive()).max(5000).optional(),
  courseId: z.number().int().positive().optional(),
  courseIds: z.array(z.number().int().positive()).max(500).optional(),
  expiresAt: z.number().int().nullish(),
});

export const bulk = z.object({
  ids: z.array(z.number().int()).min(1).max(5000),
  action: z.enum(["suspend", "reactivate", "expire", "delete"]),
});

export type EnrollmentCreate = z.infer<typeof create>;
export type EnrollmentBulk = z.infer<typeof bulk>;

async function enroll(me: Actor, _params: Record<string, never>, input: EnrollmentCreate) {
  const ip = await clientIp();
  const uids = [...new Set([...(input.userIds ?? []), ...(input.userId ? [input.userId] : [])])];
  const cids = [...new Set([...(input.courseIds ?? []), ...(input.courseId ? [input.courseId] : [])])];
  if (!uids.length || !cids.length) throw new DomainError(400, "Provide user(s) and course(s)");

  return db.transaction((tx) => {
    const validUsers = new Set(
      tx.select({ id: users.id }).from(users)
        .where(and(inArray(users.id, uids), eq(users.status, "active")))
        .all()
        .map((r) => r.id)
    );
    const validCourses = new Set(
      tx.select({ id: courses.id }).from(courses).where(inArray(courses.id, cids)).all().map((r) => r.id)
    );
    const results: { userId: number; courseId: number; ok: boolean; reason?: string }[] = [];
    const now = new Date();
    const expiry = input.expiresAt ? new Date(input.expiresAt) : null;
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
    refreshCourseCounters(tx, cids);
    refreshUserCounters(tx, uids);
    const succeeded = results.filter((r) => r.ok).length;
    if (succeeded) {
      const label =
        uids.length === 1 && cids.length === 1
          ? `user ${uids[0]} → course ${cids[0]}`
          : `${succeeded} enrollment(s)`;
      auditTx(tx, me, {
        action: succeeded > 1 ? A.bulk : A.single,
        targetType: "enrollment",
        targetLabel: label,
        module: "enrollments",
        details: { requested: uids.length * cids.length, succeeded, failed: results.length - succeeded },
      }, ip);
    }
    return { results, succeeded, failed: results.length - succeeded };
  });
}

async function bulkUpdate(me: Actor, _params: Record<string, never>, input: EnrollmentBulk) {
  const ip = await clientIp();
  const { ids, action } = input;
  return db.transaction((tx) => {
    // resolve affected (user, course) pairs BEFORE mutating so counters hit the right rows
    const affected = tx
      .select({ userId: enrollments.userId, courseId: enrollments.courseId })
      .from(enrollments)
      .where(inArray(enrollments.id, ids))
      .all();
    if (action === "delete") {
      tx.delete(enrollments).where(inArray(enrollments.id, ids)).run();
    } else {
      const status = action === "suspend" ? "suspended" : action === "expire" ? "expired" : "active";
      tx.update(enrollments).set({ status }).where(inArray(enrollments.id, ids)).run();
    }
    refreshCourseCounters(tx, affected.map((r) => r.courseId));
    refreshUserCounters(tx, affected.map((r) => r.userId));
    const actionLabel = { suspend: "suspended", reactivate: "reactivated", expire: "expired", delete: "deleted" }[action];
    auditTx(tx, me, { action: `${actionLabel} ${ids.length} enrollment(s)`, targetType: "enrollment", targetLabel: `${ids.length} rows`, module: "enrollments" }, ip);
    return { updated: ids.length };
  });
}

export const write = {
  create: { schema: create, run: enroll },
  bulk: { schema: bulk, run: bulkUpdate },
};
