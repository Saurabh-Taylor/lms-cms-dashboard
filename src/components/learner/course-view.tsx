"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, CheckCircle2Icon,
  CodeIcon, FileTextIcon, FlaskConicalIcon, LinkIcon, CirclePlayIcon,
  ClipboardListIcon, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerCourseDetail } from "@/lib/learner-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const LESSON_ICONS: Record<string, LucideIcon> = {
  video: CirclePlayIcon,
  text: FileTextIcon,
  pdf: FileTextIcon,
  link: LinkIcon,
  code: CodeIcon,
  quiz: ClipboardListIcon,
  lab: FlaskConicalIcon,
  assignment: ClipboardListIcon,
};

interface LessonBlockData {
  id: string;
  type: string;
  text?: string;
}

function LessonBlocks({ blocks }: { blocks: string }) {
  let parsed: LessonBlockData[] = [];
  try {
    parsed = JSON.parse(blocks);
  } catch { /* malformed content renders empty */ }
  if (!parsed.length)
    return <p className="text-sm text-muted-foreground">This lesson has no content yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      {parsed.map((b) => {
        if (b.type === "text")
          return <p key={b.id} className="text-sm leading-6 text-foreground/90">{b.text}</p>;
        if (b.type === "code")
          return (
            <pre key={b.id} className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-5">
              {b.text}
            </pre>
          );
        const Icon = LESSON_ICONS[b.type] ?? BookOpenIcon;
        return (
          <div key={b.id} className="flex items-center gap-3 rounded-md border border-dashed bg-muted/30 p-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium capitalize text-muted-foreground">{b.type} material</p>
              {b.text && <p className="truncate text-sm">{b.text}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CourseView({ courseId }: { courseId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/learner/courses", courseId],
    queryFn: () => api<LearnerCourseDetail>(`/api/learner/courses/${courseId}`),
  });

  const flat = React.useMemo(
    () => (data?.sections ?? []).flatMap((s) => s.lessons.map((l) => ({ ...l, sectionTitle: s.title }))),
    [data]
  );

  const selectedId = Number(searchParams.get("lesson")) || flat[0]?.id;
  const idx = flat.findIndex((l) => l.id === selectedId);
  const lesson = idx >= 0 ? flat[idx] : flat[0];
  const lessonIdx = idx >= 0 ? idx : 0;

  const selectLesson = (id: number) => {
    router.replace(`${pathname}?lesson=${id}` as never, { scroll: false });
  };

  // activity ping — powers continue-learning ordering on the dashboard
  React.useEffect(() => {
    api("/api/learner/activity", {
      method: "POST",
      body: JSON.stringify({ type: "course_opened", courseId }),
    }).catch(() => {});
  }, [courseId]);
  const lessonId = lesson?.id;
  React.useEffect(() => {
    if (lessonId == null) return;
    api("/api/learner/activity", {
      method: "POST",
      body: JSON.stringify({ type: "lesson_viewed", courseId }),
    }).catch(() => {});
  }, [lessonId, courseId]);

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        title="Course unavailable"
        description={(error as Error)?.message ?? "You are not enrolled in this course."}
        action={
          <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
        }
      />
    );
  }

  const { course, enrollment } = data;
  const done = enrollment.status === "completed";

  return (
    <div className="flex flex-col gap-5">
      {/* course header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: course.thumbnailColor }} aria-hidden />
            <h1 className="text-(length:--fs-page-title) leading-7 font-semibold tracking-tight">{course.title}</h1>
          </div>
          <p className="mt-0.5 text-(length:--fs-page-desc) text-muted-foreground">
            {[course.instructorName, course.categoryName, course.difficulty, fmtDuration(course.estimatedMinutes)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Progress value={enrollment.progress} className="h-1.5 w-28" />
            <span className="text-xs tabular-nums text-muted-foreground">{enrollment.progress}%</span>
          </div>
          {done && (
            <Badge variant="outline" className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3" /> Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        {/* lesson content */}
        <Card className="min-w-0">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">{flat[lessonIdx]?.sectionTitle}</p>
                <CardTitle className="mt-0.5 truncate text-sm font-medium">
                  {lesson ? `${lessonIdx + 1}. ${lesson.title}` : "No lessons"}
                </CardTitle>
              </div>
              {lesson && (
                <Badge variant="secondary" className="shrink-0 capitalize">{lesson.type}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {lesson ? <LessonBlocks blocks={lesson.blocks} /> : (
              <p className="text-sm text-muted-foreground">This course has no published lessons yet.</p>
            )}
          </CardContent>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <Button
              variant="ghost" size="sm" disabled={lessonIdx <= 0}
              onClick={() => selectLesson(flat[lessonIdx - 1].id)}
            >
              <ArrowLeftIcon /> Previous
            </Button>
            <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">
              {flat.length ? `${lessonIdx + 1} of ${flat.length}` : ""}
            </span>
            <Button
              variant="ghost" size="sm" disabled={lessonIdx >= flat.length - 1}
              onClick={() => selectLesson(flat[lessonIdx + 1].id)}
            >
              Next <ArrowRightIcon />
            </Button>
          </div>
        </Card>

        {/* curriculum rail */}
        <Card className="lg:sticky lg:top-16">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Course content</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto pt-0">
            {data.sections.map((s) => (
              <div key={s.id}>
                <p className="border-b pb-1 pt-3 text-(length:--fs-meta) leading-4 font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {s.title}
                </p>
                <ul>
                  {s.lessons.map((l) => {
                    const Icon = LESSON_ICONS[l.type] ?? FileTextIcon;
                    const active = l.id === lesson?.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => selectLesson(l.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-(--duration-fast) hover:bg-muted",
                            active && "bg-accent font-medium text-accent-foreground"
                          )}
                          aria-current={active ? "true" : undefined}
                        >
                          <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {fmtDuration(l.durationMin)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
