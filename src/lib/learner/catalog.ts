// Catalog domain — the public course shelf + self-enrollment.
// Visibility semantics: `public` courses appear in the catalog; `unlisted` are
// direct-link only; `private` are never exposed to learners.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, courses, enrollments, users } from "@/lib/db/schema";
import { refreshCourseCounters, refreshUserCounters } from "@/lib/db/aggregates";
import { likePattern } from "@/lib/api/helpers";
import { DomainError } from "@/lib/domain";
import type { LearnerCatalogCourse } from "@/lib/learner-types";

const cols = {
  id: courses.id,
  title: courses.title,
  description: courses.description,
  difficulty: courses.difficulty,
  thumbnailColor: courses.thumbnailColor,
  estimatedMinutes: courses.estimatedMinutes,
  lessonCount: courses.lessonCount,
  enrollmentCount: courses.enrollmentCount,
  instructorName: users.name,
  categoryName: categories.name,
};

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);

/** Published + public courses, newest first; `enrollment` is the caller's own row or null. */
export function listCatalog(
  userId: number,
  opts: { q?: string | null; categoryId?: number | null; page: number; pageSize: number }
): { data: LearnerCatalogCourse[]; total: number } {
  const conds = [eq(courses.status, "published"), eq(courses.visibility, "public")];
  if (opts.q) conds.push(sql`lower(${courses.title}) LIKE ${likePattern(opts.q)}`);
  if (opts.categoryId) conds.push(eq(courses.categoryId, opts.categoryId));

  const where = sql.join(conds, sql` AND `);
  const [{ total }] = db.select({ total: sql<number>`COUNT(*)` }).from(courses).where(where).all();
  const rows = db
    .select({
      ...cols,
      enrollmentId: enrollments.id,
      enrollmentStatus: enrollments.status,
      enrollmentProgress: enrollments.progress,
      enrolledAt: enrollments.enrolledAt,
      expiresAt: enrollments.expiresAt,
      completedAt: enrollments.completedAt,
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .leftJoin(
      enrollments,
      and(eq(enrollments.courseId, courses.id), eq(enrollments.userId, userId))
    )
    .where(where)
    .orderBy(desc(courses.createdAt))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
    .all();

  return {
    total: Number(total),
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      difficulty: r.difficulty,
      thumbnailColor: r.thumbnailColor,
      estimatedMinutes: r.estimatedMinutes,
      lessonCount: r.lessonCount,
      enrollmentCount: r.enrollmentCount,
      instructorName: r.instructorName,
      categoryName: r.categoryName,
      enrollment: r.enrollmentId
        ? {
            id: r.enrollmentId,
            status: r.enrollmentStatus!,
            progress: r.enrollmentProgress ?? 0,
            enrolledAt: r.enrolledAt!.getTime(),
            expiresAt: ms(r.expiresAt),
            completedAt: ms(r.completedAt),
          }
        : null,
    })),
  };
}

/**
 * Self-enroll: published + public only — the 404 keeps unlisted/private
 * courses invisible. Existing enrollment (any status) → 409 rather than a
 * silent re-activation.
 */
export function selfEnroll(userId: number, courseId: number) {
  return db.transaction((tx) => {
    const course = tx
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.status, "published"),
          eq(courses.visibility, "public")
        )
      )
      .all()[0];
    if (!course) throw new DomainError(404, "Course not found");
    const existing = tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .all()[0];
    if (existing) throw new DomainError(409, "Already enrolled");
    const [row] = tx
      .insert(enrollments)
      .values({ userId, courseId, status: "active", progress: 0, enrolledAt: new Date() })
      .returning()
      .all();
    refreshCourseCounters(tx, [courseId]);
    refreshUserCounters(tx, [userId]);
    return row;
  });
}
