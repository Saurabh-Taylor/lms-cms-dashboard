import Link from "next/link";
import { notFound } from "next/navigation";
import { apiServer } from "@/lib/api-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { fmtDuration, fmtRelative } from "@/lib/format";

interface LessonRow {
  id: number;
  title: string;
  type: string;
  durationMin: number;
  status: string;
}

interface EnrollmentRow {
  id: number;
  userId: number;
  userName: string;
  status: string;
  progress: number;
  enrolledAt: string;
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const id = Number(courseId);

  const [course, curriculum, recentRes, activeRes, completedRes] = await Promise.all([
    apiServer<{ avgProgress: number }>(`/api/v1/admin/courses/${id}`).catch(() => null),
    apiServer<{ sections: { lessons: LessonRow[] }[] }>(`/api/v1/admin/courses/${id}/curriculum`),
    apiServer<{ data: EnrollmentRow[]; total: number }>(
      `/api/v1/admin/enrollments?courseId=${id}&pageSize=8&sort=enrolledAt&order=desc`,
    ),
    apiServer<{ total: number }>(`/api/v1/admin/enrollments?courseId=${id}&status=active&pageSize=5`),
    apiServer<{ total: number }>(`/api/v1/admin/enrollments?courseId=${id}&status=completed&pageSize=5`),
  ]);
  if (!course) notFound();

  const sectionCount = curriculum.sections.length;
  const lessonRows = curriculum.sections.flatMap((s) => s.lessons).slice(0, 200);
  const e = {
    total: recentRes.total,
    active: activeRes.total,
    completed: completedRes.total,
    avgProgress: Math.round(course.avgProgress ?? 0),
  };

  const totalMin = lessonRows.reduce((a, l) => a + l.durationMin, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-sm font-medium">Content summary</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{sectionCount}</p>
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Sections</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{lessonRows.length}</p>
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Chapters</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-2xl font-semibold tabular-nums">{fmtDuration(totalMin)}</p>
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Content length</p>
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
                <span className="text-(length:--fs-meta) leading-4 text-muted-foreground capitalize">{l.type}</span>
                <span className="text-(length:--fs-meta) leading-4 text-muted-foreground tabular-nums">{l.durationMin}m</span>
                <StatusBadge value={l.status} />
              </Link>
            ))}
            {lessonRows.length > 10 && (
              <div className="px-3 py-2 text-(length:--fs-meta) leading-4 text-muted-foreground">
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
            <div className="flex justify-between"><span className="text-muted-foreground">Total enrolled</span><span className="font-medium tabular-nums">{e.total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="tabular-nums">{e.active}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="tabular-nums">{e.completed}</span></div>
            <div>
              <div className="mb-1 flex justify-between text-(length:--fs-meta) leading-4 text-muted-foreground"><span>Avg progress</span><span>{e.avgProgress}%</span></div>
              <Progress value={e.avgProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Recent enrollments</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y text-sm">
              {recentRes.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/learners/${r.userId}` as never} className="truncate font-medium hover:underline">{r.userName}</Link>
                  <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">{fmtRelative(r.enrolledAt)}</span>
                </li>
              ))}
              {!recentRes.data.length && (
                <li className="py-4 text-center text-muted-foreground">No enrollments yet</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
