"use client";

import Link from "next/link";
import type { LearnerCourse } from "@/lib/learner-types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDuration } from "@/lib/format";

/** Enrolled-course card — shared by the dashboard and My Learning. */
export function LearningCard({ course }: { course: LearnerCourse }) {
  const e = course.enrollment;
  const done = e.status === "completed";
  const cta = done ? "Review" : e.progress > 0 ? "Continue" : "Start";

  return (
    <Card className="overflow-hidden transition-shadow duration-(--duration-fast) hover:shadow-sm">
      <div className="h-1.5" style={{ background: course.thumbnailColor }} aria-hidden />
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="min-w-0">
          <Link
            href={`/learner/courses/${course.id}` as never}
            className="block truncate text-sm font-medium hover:underline"
          >
            {course.title}
          </Link>
          <p className="mt-0.5 truncate text-(length:--fs-meta) leading-4 text-muted-foreground">
            {[course.instructorName, course.categoryName, fmtDuration(course.estimatedMinutes)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={e.progress} className="h-1.5 flex-1" />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {e.progress}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <StatusBadge value={e.status} />
          <Button
            size="sm"
            variant={done ? "outline" : "default"}
            nativeButton={false}
            render={<Link href={`/learner/courses/${course.id}` as never} />}
          >
            {cta}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
