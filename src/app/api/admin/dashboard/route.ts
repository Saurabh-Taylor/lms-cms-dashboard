import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  activityEvents, certificates, courses, enrollments, labs, users,
} from "@/lib/db/schema";
import { ok } from "@/lib/api/helpers";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const rangeDays = Math.min(365, Math.max(7, Number(sp.get("range")) || 30));
  const since = new Date(Date.now() - rangeDays * 86400000);

  const [t] = await db.select({
    learners: sql<number>`SUM(CASE WHEN ${users.role} = 'learner' THEN 1 ELSE 0 END)`,
    activeLearners: sql<number>`SUM(CASE WHEN ${users.role} = 'learner' AND ${users.status} = 'active' THEN 1 ELSE 0 END)`,
  }).from(users);

  const [c] = await db.select({
    courses: sql<number>`COUNT(*)`,
    published: sql<number>`SUM(CASE WHEN ${courses.status} = 'published' THEN 1 ELSE 0 END)`,
  }).from(courses);

  const [e] = await db.select({
    enrollments: sql<number>`COUNT(*)`,
    completionRate: sql<number>`CAST(100.0 * SUM(CASE WHEN ${enrollments.status} = 'completed' THEN 1 ELSE 0 END) / COUNT(*) AS INT)`,
  }).from(enrollments);

  const [l] = await db.select({
    active: sql<number>`SUM(CASE WHEN ${labs.status} = 'active' THEN 1 ELSE 0 END)`,
  }).from(labs);

  const [cert] = await db.select({ total: sql<number>`COUNT(*)` }).from(certificates);

  // enrollment time series (day buckets)
  const series = await db.all<{ date: string; count: number }>(sql`
    SELECT strftime('%Y-%m-%d', datetime(${enrollments.enrolledAt} / 1000, 'unixepoch')) AS date,
           COUNT(*) AS count
    FROM ${enrollments}
    WHERE ${enrollments.enrolledAt} >= ${since.getTime()}
    GROUP BY date ORDER BY date`);

  // fill missing days
  const byDay = new Map(series.map((r) => [r.date, r.count]));
  const enrollmentSeries: { date: string; count: number }[] = [];
  const step = rangeDays > 120 ? 7 : 1; // weekly buckets for long ranges
  for (let i = rangeDays; i >= 0; i -= step) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    if (step === 1) enrollmentSeries.push({ date: key, count: byDay.get(key) ?? 0 });
    else {
      let sum = 0;
      for (let k = 0; k < step; k++) {
        const k2 = new Date(dt.getTime() - k * 86400000).toISOString().slice(0, 10);
        sum += byDay.get(k2) ?? 0;
      }
      enrollmentSeries.push({ date: key, count: sum });
    }
  }

  const coursePerformance = await db
    .select({
      id: courses.id, title: courses.title, status: courses.status,
      enrollmentCount: courses.enrollmentCount,
      completionRate: courses.completionRate,
      avgProgress: courses.avgProgress,
    })
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(desc(courses.enrollmentCount))
    .limit(8);

  const recentActivity = await db
    .select({
      id: activityEvents.id,
      userName: users.name,
      type: activityEvents.type,
      courseId: activityEvents.courseId,
      courseTitle: courses.title,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .innerJoin(users, eq(activityEvents.userId, users.id))
    .leftJoin(courses, eq(activityEvents.courseId, courses.id))
    .orderBy(desc(activityEvents.createdAt))
    .limit(10);

  return ok({
    totals: {
      learners: t?.learners ?? 0,
      activeLearners: t?.activeLearners ?? 0,
      courses: c?.courses ?? 0,
      publishedCourses: c?.published ?? 0,
      enrollments: e?.enrollments ?? 0,
      completionRate: e?.completionRate ?? 0,
      activeLabs: l?.active ?? 0,
      certificates: cert?.total ?? 0,
    },
    enrollmentSeries,
    coursePerformance,
    recentActivity,
  });
}
