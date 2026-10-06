"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, CompassIcon, SearchIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { LearnerCatalogCourse } from "@/lib/learner-types";
import { Button } from "@/components/ui/button";

import { CourseCard } from "@/components/learner/course-card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDuration } from "@/lib/format";
import { qk } from "@/lib/query-keys";

interface CatalogResponse {
  data: LearnerCatalogCourse[];
  total: number;
  page: number;
  pageSize: number;
}

function CatalogCard({ course }: { course: LearnerCatalogCourse }) {
  const enrolled = course.enrollment != null;
  const enroll = useApiMutation({
    mutationFn: () =>
      api(`/api/learner/courses/${course.id}/enroll`, { method: "POST" }),
    invalidate: [qk.learnerCatalog, qk.learnerCourses],
    successToast: `Enrolled in ${course.title}`,
  });

  return (
    <CourseCard course={course}>
        <div className="min-w-0">
          {enrolled ? (
            <Link
              href={`/learner/courses/${course.id}` as never}
              className="block truncate text-sm font-medium hover:underline"
            >
              {course.title}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium">{course.title}</p>
          )}
          <p className="mt-0.5 truncate text-(length:--fs-meta) leading-4 text-muted-foreground">
            {[course.instructorName, course.categoryName, fmtDuration(course.estimatedMinutes)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {enrolled ? (
          <div className="flex items-center gap-2">
            <Progress value={course.enrollment!.progress} className="h-1.5 flex-1" />
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
              {course.enrollment!.progress}%
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {course.lessonCount} lessons · {course.enrollmentCount} enrolled
          </p>
        )}
        <div className="flex items-center justify-between">
          {enrolled ? (
            <StatusBadge value={course.enrollment!.status} />
          ) : (
            <span className="text-xs capitalize text-muted-foreground">{course.difficulty}</span>
          )}
          {enrolled ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/learner/courses/${course.id}` as never} />}
            >
              Open
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={enroll.isPending}
              onClick={() => enroll.mutate()}
            >
              {enroll.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          )}
        </div>
    </CourseCard>
  );
}

export function CatalogBrowser() {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: [...qk.learnerCatalog, { q: debounced, page }],
    queryFn: () =>
      api<CatalogResponse>(
        `/api/learner/catalog?page=${page}&pageSize=12${debounced ? `&q=${encodeURIComponent(debounced)}` : ""}`
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search courses…"
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : data?.data.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.data.map((c) => <CatalogCard key={c.id} course={c} />)}
        </div>
      ) : (
        <EmptyState
          icon={CompassIcon}
          title="No courses found"
          description={
            debounced
              ? "Try a different search — only published public courses appear here."
              : "No published courses are open for self-enrollment right now."
          }
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Page {data?.page ?? 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
