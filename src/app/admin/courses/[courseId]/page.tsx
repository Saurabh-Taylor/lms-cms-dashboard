import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { enrollments, lessons, sections, users } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { fmtDuration, fmtRelative } from "@/lib/format";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const id = Number(courseId);

  const sectionCount = await db.select({ n: sql<number>`COUNT(*)` }).from(sections).where(eq(sections.courseId, id));
  const lessonRows = await db
    .select({ id: lessons.id, title: lessons.title, type: lessons.type, durationMin: lessons.durationMin, status: lessons.status })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(eq(sections.courseId, id))
    .limit(200);
  const [e] = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(status='active')`,
    completed: sql<number>`SUM(status='completed')`,
    avgProgress: sql<number>`COALESCE(CAST(AVG(progress) AS INT),0)`,
  }).from(enrollments).where(eq(enrollments.courseId, id));

  const recentEnrollments = await db
    .select({
      id: enrollments.id, userId: enrollments.userId, progress: enrollments.progress,
      status: enrollments.status, enrolledAt: enrollments.enrolledAt, userName: users.name,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(eq(enrollments.courseId, id))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(8);

  const totalMin = lessonRows.reduce((a, l) => a + l.durationMin, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-sm font-medium">Content summary</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{sectionCount[0]?.n ?? 0}</p>
              <p className="text-xs text-muted-foreground">Sections</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{lessonRows.length}</p>
              <p className="text-xs text-muted-foreground">Chapters</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{fmtDuration(totalMin)}</p>
              <p className="text-xs text-muted-foreground">Content length</p>
            </div>
          </div>
          <div className="divide-y rounded-md border">
            {lessonRows.slice(0, 10).map((l) => (
              <Link
                key={l.id}
                href={`/admin/courses/${id}/lessons/${l.id}` as never}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
              >
                <span className="flex-1 truncate">{l.title}</span>
                <span className="text-xs text-muted-foreground capitalize">{l.type}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{l.durationMin}m</span>
                <StatusBadge value={l.status} />
              </Link>
            ))}
            {lessonRows.length > 10 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                + {lessonRows.length - 10} more — manage in{" "}
                <Link href={`/admin/courses/${id}/content` as never} className="underline">Content</Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Enrollment</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total enrolled</span><span className="font-medium tabular-nums">{(e?.total ?? 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="tabular-nums">{e?.active ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="tabular-nums">{e?.completed ?? 0}</span></div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Avg progress</span><span>{e?.avgProgress ?? 0}%</span></div>
              <Progress value={e?.avgProgress ?? 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Recent enrollments</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y text-sm">
              {recentEnrollments.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/learners/${r.userId}` as never} className="truncate font-medium hover:underline">{r.userName}</Link>
                  <span className="text-xs text-muted-foreground">{fmtRelative(r.enrolledAt)}</span>
                </li>
              ))}
              {!recentEnrollments.length && (
                <li className="py-4 text-center text-muted-foreground">No enrollments yet</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
