"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import type { OptionItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { AsyncCombobox } from "@/components/async-combobox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface AnalyticsData {
  learners: { newRegistrations: number; active: number; returning: number };
  registrationsSeries: { date: string; n: number }[];
  enrollmentsSeries: { date: string; n: number }[];
  engagementByType: { type: string; n: number }[];
  topCourses: { id: number; title: string; enrollmentCount: number; completionRate: number; avgProgress: number }[];
  coursesByCategory: { name: string; n: number }[];
  assessments: { avgScore: number; passRate: number; attempts: number; hardest: { id: number; title: string; avgScore: number; passRate: number; attemptCount: number }[] };
}

export function AnalyticsClient() {
  const [range, setRange] = React.useState("30");
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const [category, setCategory] = React.useState<OptionItem | null>(null);

  const q = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics", range, course?.id, category?.id],
    queryFn: () => api(`/api/admin/analytics?range=${range}${course ? `&courseId=${course.id}` : ""}${category ? `&categoryId=${category.id}` : ""}`),
    placeholderData: (prev) => prev,
  });
  const d = q.data;

  return (
    <div className="flex flex-col gap-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={(v) => setRange(String(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-56"><AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as OptionItem | null)} placeholder="All courses" /></div>
        <div className="w-48"><AsyncCombobox resource="categories" value={category} onChange={(v) => setCategory(v as OptionItem | null)} placeholder="All categories" /></div>
        {q.isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      {/* learner KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="New registrations" value={d?.learners.newRegistrations} />
        <StatCard label="Active learners" value={d?.learners.active} />
        <StatCard label="Returning learners" value={d?.learners.returning} sub="more than one session" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="New registrations" loading={!d} data={d?.registrationsSeries} color="var(--color-chart-1)" />
        <ChartCard title="Enrollments" loading={!d} data={d?.enrollmentsSeries} color="var(--color-chart-2)" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* engagement by type */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Engagement by event type</CardTitle></CardHeader>
          <CardContent>
            {!d ? <Skeleton className="h-56" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={d.engagementByType.map((r) => ({ ...r, name: r.type.replace(/_/g, " ") }))} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Bar dataKey="n" fill="var(--color-chart-3)" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* top courses */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Top courses by enrollment</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!d ? <Skeleton className="m-4 h-56" /> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Course</th>
                  <th className="px-4 py-2 text-right font-medium">Enrolled</th>
                  <th className="px-4 py-2 text-right font-medium">Completion</th>
                </tr></thead>
                <tbody>
                  {d.topCourses.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-4 py-2"><Link href={`/admin/courses/${c.id}` as never} className="hover:underline">{c.title}</Link></td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.enrollmentCount.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={c.completionRate} className="w-16" />
                          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{c.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* assessments */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Assessment health</CardTitle>
            {d && <span className="text-xs text-muted-foreground">{d.assessments.attempts.toLocaleString()} attempts · avg {d.assessments.avgScore}% · {d.assessments.passRate}% pass</span>}
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Hardest assessments</th>
                <th className="px-4 py-2 text-right font-medium">Attempts</th>
                <th className="px-4 py-2 text-right font-medium">Avg score</th>
                <th className="px-4 py-2 text-right font-medium">Pass rate</th>
              </tr></thead>
              <tbody>
                {(d?.assessments.hardest ?? []).map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-2"><Link href={`/admin/assessments/${a.id}` as never} className="hover:underline">{a.title}</Link></td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.attemptCount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.avgScore}%</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-xs font-medium tabular-nums ${a.passRate >= 70 ? "text-emerald-600" : a.passRate >= 45 ? "text-amber-600" : "text-red-600"}`}>{a.passRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* category share */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Courses by category</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(d?.coursesByCategory ?? []).map((c) => {
              const total = d!.coursesByCategory.reduce((s, x) => s + x.n, 0) || 1;
              return (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="w-28 truncate text-xs text-muted-foreground">{c.name}</span>
                  <Progress value={Math.round((c.n / total) * 100)} className="flex-1" />
                  <span className="w-10 text-right text-xs tabular-nums">{c.n}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, data, loading, color }: { title: string; data?: { date: string; n: number }[]; loading: boolean; color: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-52" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 8 }}>
              <defs>
                <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} stroke="var(--muted-foreground)" />
              <YAxis width={36} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip />
              <Area dataKey="n" stroke={color} fill={`url(#g-${title})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
