"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AwardIcon, BookOpenIcon, MegaphoneIcon,
  TimerIcon, TrendingUpIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerDashboard } from "@/lib/learner-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LearningCard } from "@/components/learner/learning-card";
import { fmtDate } from "@/lib/format";

export function DashboardClient({ firstName }: { firstName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/learner/dashboard"],
    queryFn: () => api<LearnerDashboard>("/api/learner/dashboard"),
  });

  const s = data?.stats;
  const cards = [
    { label: "Enrolled", value: s?.enrolled, icon: BookOpenIcon },
    { label: "In progress", value: s?.inProgress, icon: TrendingUpIcon },
    { label: "Avg progress", value: s ? `${s.avgProgress}%` : undefined, icon: TimerIcon },
    { label: "Certificates", value: s?.certificates, icon: AwardIcon },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your learning at a glance"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={typeof c.value === "number" ? c.value.toLocaleString() : c.value ?? "—"}
            icon={c.icon}
            loading={isLoading}
          />
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Continue learning</h2>
          <Link href={"/learner/my-learning" as never} className="text-(length:--fs-meta) leading-4 text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : data?.continueLearning.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.continueLearning.map((c) => <LearningCard key={c.id} course={c} />)}
          </div>
        ) : (
          <EmptyState
            icon={BookOpenIcon}
            title="No courses in progress"
            description="Once you're enrolled in a course, it will show up here."
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.dueSoon.length ? (
              <ul className="divide-y">
                {data.dueSoon.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                    <BookOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <Link href={d.href as never} className="min-w-0 flex-1 truncate font-medium hover:underline">
                      {d.title}
                    </Link>
                    <span className="shrink-0 text-(length:--fs-meta) leading-4 text-muted-foreground">
                      Access ends {fmtDate(d.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing due soon.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Link href={"/learner/announcements" as never} className="text-(length:--fs-meta) leading-4 text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.announcements.length ? (
              <ul className="divide-y">
                {data.announcements.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 py-2 text-sm">
                    <MegaphoneIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">{fmtDate(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No announcements.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
