"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerCourse } from "@/lib/learner-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LearningCard } from "@/components/learner/learning-card";

export default function MyLearningPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/learner/courses"],
    queryFn: () => api<LearnerCourse[]>("/api/learner/courses"),
  });
  const [tab, setTab] = React.useState("active");

  const courses = React.useMemo(() => {
    const all = data ?? [];
    if (tab === "active") return all.filter((c) => c.enrollment.status === "active");
    if (tab === "completed") return all.filter((c) => c.enrollment.status === "completed");
    return all;
  }, [data, tab]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="My Learning" description="Courses you're enrolled in" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">In progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : courses.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {courses.map((c) => <LearningCard key={c.id} course={c} />)}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenIcon}
          title={tab === "completed" ? "No completed courses yet" : "No courses assigned yet"}
          description="Your enrollments are managed by your administrator — new courses appear here automatically."
        />
      )}
    </div>
  );
}
