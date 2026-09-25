"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AwardIcon, GraduationCapIcon, BookOpenIcon,
  UsersIcon, ActivityIcon, CheckCircleIcon, TrendingUpIcon,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, qs } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
];

const ACTIVITY_LABEL: Record<string, string> = {
  logged_in: "logged in",
  course_opened: "opened course",
  chapter_completed: "completed a chapter in",
  lab_started: "started lab",
  lab_completed: "completed lab",
  assignment_submitted: "submitted an assignment for",
  quiz_completed: "completed a quiz in",
  resource_downloaded: "downloaded a resource from",
  certificate_viewed: "viewed a certificate for",
};

export default function DashboardPage() {
  const [range, setRange] = React.useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => api<DashboardStats>(`/api/admin/dashboard${qs({ range })}`),
  });

  const t = data?.totals;
  const cards = [
    { label: "Total learners", value: t?.learners, icon: GraduationCapIcon },
    { label: "Active learners", value: t?.activeLearners, icon: UsersIcon, sub: "not suspended" },
    { label: "Total courses", value: t?.courses, icon: BookOpenIcon },
    { label: "Published courses", value: t?.publishedCourses, icon: CheckCircleIcon },
    { label: "Enrollments", value: t?.enrollments, icon: TrendingUpIcon },
    { label: "Completion rate", value: t ? `${t.completionRate}%` : undefined, icon: ActivityIcon },
    { label: "Certificates issued", value: t?.certificates, icon: AwardIcon },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Dashboard" description="Platform overview and operational health" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={typeof c.value === "number" ? c.value.toLocaleString() : c.value ?? "—"}
            sub={c.sub}
            icon={c.icon}
            loading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Enrollment activity</CardTitle>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    range === r.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart data={data?.enrollmentSeries ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="enr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)", border: "1px solid var(--border)",
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={1.8} fill="url(#enr)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <ul className="divide-y">
                {(data?.recentActivity ?? []).map((a) => (
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
            )}
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
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
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
                  {(data?.coursePerformance ?? []).map((c) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
