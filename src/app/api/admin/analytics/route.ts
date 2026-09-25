import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  activityEvents, assessmentAttempts, assessments, categories,
  courses, enrollments, users,
} from "@/lib/db/schema";
import { ok } from "@/lib/api/helpers";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const rangeDays = Math.min(365, Math.max(7, Number(sp.get("range")) || 30));
  const courseId = sp.get("courseId") ? Number(sp.get("courseId")) : null;
  const categoryId = sp.get("categoryId") ? Number(sp.get("categoryId")) : null;
  const since = Date.now() - rangeDays * 86400000;

  const courseFilter = sql`${courseId ? sql`AND ${enrollments.courseId} = ${courseId}` : sql``}
    ${categoryId ? sql`AND ${enrollments.courseId} IN (SELECT id FROM courses WHERE category_id = ${categoryId})` : sql``}`;

  // --- learners ---
  const [newLearners] = await db.all<{ n: number }>(sql`
    SELECT COUNT(*) n FROM ${users}
    WHERE role='learner' AND created_at >= ${since}`);
  const [activeLearners] = await db.all<{ n: number }>(sql`
    SELECT COUNT(*) n FROM ${users}
    WHERE role='learner' AND last_active_at >= ${since}`);
  const [returningLearners] = await db.all<{ n: number }>(sql`
    SELECT COUNT(*) n FROM (
      SELECT user_id FROM ${activityEvents}
      WHERE created_at >= ${since}
      GROUP BY user_id HAVING COUNT(*) > 1)`);

  // --- registrations over time ---
  const regRows = await db.all<{ date: string; n: number }>(sql`
    SELECT strftime('%Y-%m-%d', datetime(created_at/1000,'unixepoch')) date, COUNT(*) n
    FROM ${users} WHERE role='learner' AND created_at >= ${since}
    GROUP BY date ORDER BY date`);

  // --- engagement: activity by type ---
  const actByType = await db.all<{ type: string; n: number }>(sql`
    SELECT type, COUNT(*) n FROM ${activityEvents}
    WHERE created_at >= ${since} GROUP BY type ORDER BY n DESC`);

  // --- courses: top enrolled / completion / drop-off ---
  const conds = [eq(courses.status, "published")];
  if (courseId) conds.push(eq(courses.id, courseId));
  if (categoryId) conds.push(eq(courses.categoryId, categoryId));
  const topCourses = await db
    .select({
      id: courses.id, title: courses.title,
      enrollmentCount: courses.enrollmentCount,
      completionRate: courses.completionRate,
      avgProgress: courses.avgProgress,
    })
    .from(courses)
    .where(sql.join(conds, sql` AND `))
    .orderBy(desc(courses.enrollmentCount))
    .limit(10);

  const byCategory = await db
    .select({ name: categories.name, n: sql<number>`COUNT(${courses.id})` })
    .from(categories)
    .leftJoin(courses, eq(courses.categoryId, categories.id))
    .groupBy(categories.name)
    .orderBy(desc(sql`COUNT(${courses.id})`));

  // --- assessments ---
  const [aAgg] = await db.select({
    avgScore: sql<number>`COALESCE(CAST(AVG(${assessmentAttempts.score}) AS INT),0)`,
    passRate: sql<number>`COALESCE(CAST(100.0*SUM(${assessmentAttempts.passed})/COUNT(*) AS INT),0)`,
    attempts: sql<number>`COUNT(*)`,
  }).from(assessmentAttempts);
  const hardest = await db
    .select({
      id: assessments.id, title: assessments.title,
      avgScore: assessments.avgScore, passRate: assessments.passRate,
      attemptCount: assessments.attemptCount,
    })
    .from(assessments)
    .where(sql`${assessments.attemptCount} > 20`)
    .orderBy(sql`${assessments.avgScore} ASC`)
    .limit(6);

  // enrollments per day (chart)
  const enrRows = await db.all<{ date: string; n: number }>(sql`
    SELECT strftime('%Y-%m-%d', datetime(enrolled_at/1000,'unixepoch')) date, COUNT(*) n
    FROM ${enrollments} WHERE enrolled_at >= ${since} ${courseFilter}
    GROUP BY date ORDER BY date`);

  return ok({
    learners: {
      newRegistrations: newLearners?.n ?? 0,
      active: activeLearners?.n ?? 0,
      returning: returningLearners?.n ?? 0,
    },
    registrationsSeries: regRows,
    enrollmentsSeries: enrRows,
    engagementByType: actByType,
    topCourses,
    coursesByCategory: byCategory,
    assessments: { ...aAgg, hardest },
  });
}
