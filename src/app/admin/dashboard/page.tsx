import Link from "next/link";
import {
  AwardIcon, GraduationCapIcon, BookOpenIcon,
  UsersIcon, ActivityIcon, CheckCircleIcon, TrendingUpIcon,
} from "lucide-react";
import { apiServer } from "@/lib/api-server";
import type { DashboardStats } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { fmtRelative } from "@/lib/format";
import { EnrollmentActivity } from "./enrollment-activity";

const ACTIVITY_LABEL: Record<string, string> = {
  logged_in: "logged in",
  course_opened: "opened course",
  lesson_viewed: "viewed a chapter in",
  chapter_completed: "completed a chapter in",
  course_completed: "completed course",
  certificate_earned: "earned a certificate for",
  lab_started: "started lab",
  lab_completed: "completed lab",
  assignment_submitted: "submitted an assignment for",
  quiz_completed: "completed a quiz in",
  resource_downloaded: "downloaded a resource from",
  certificate_viewed: "viewed a certificate for",
};

export default async function DashboardPage() {
  const data = await apiServer<DashboardStats>("/api/v1/admin/dashboard");
  const t = data.totals;

  const cards = [
    { label: "Total learners", value: t.learners, icon: GraduationCapIcon },
    { label: "Active learners", value: t.activeLearners, icon: UsersIcon, sub: "not suspended" },
    { label: "Total courses", value: t.courses, icon: BookOpenIcon },
    { label: "Published courses", value: t.publishedCourses, icon: CheckCircleIcon },
    { label: "Enrollments", value: t.enrollments, icon: TrendingUpIcon },
    { label: "Completion rate", value: `${t.completionRate}%`, icon: ActivityIcon },
    { label: "Certificates issued", value: t.certificates, icon: AwardIcon },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Dashboard" description="Platform overview and operational health" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={typeof c.value === "number" ? c.value.toLocaleString() : c.value}
            sub={c.sub}
            icon={c.icon}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <EnrollmentActivity />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 py-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-2" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {ACTIVITY_LABEL[a.type] ?? a.type}
                      {a.courseTitle ? (
                        <>
                          {" "}
                          <Link href={`/admin/courses/${a.courseId}` as never} className="font-medium text-foreground hover:underline">
                            {a.courseTitle}
                          </Link>
                        </>
                      ) : null}
                    </span>
                    <div className="text-(length:--fs-meta) leading-4 text-muted-foreground">{fmtRelative(a.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Course performance</CardTitle>
          <Link href={"/admin/courses" as never} className="text-(length:--fs-meta) leading-4 text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-(length:--fs-meta) leading-4 text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 pr-4 font-medium text-right">Learners</th>
                  <th className="py-2 pr-4 font-medium text-right">Completion</th>
                  <th className="py-2 pr-4 font-medium w-44">Avg progress</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.coursePerformance.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/courses/${c.id}` as never} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{c.enrollmentCount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{c.completionRate}%</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={c.avgProgress} className="h-1.5" />
                        <span className="w-8 text-xs tabular-nums text-muted-foreground">{c.avgProgress}%</span>
                      </div>
                    </td>
                    <td className="py-2.5"><StatusBadge value={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
