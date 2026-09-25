"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheckIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LearnerAssessment } from "@/lib/learner-types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDateTime, fmtDuration } from "@/lib/format";

function assessStatus(a: LearnerAssessment): string {
  if (a.attemptsUsed === 0) return "not started";
  if (a.passed) return "passed";
  if (a.attemptsUsed >= a.maxAttempts) return "failed";
  return "in progress";
}

/**
 * Learner-facing assessment list — quizzes/exams or assignments depending on
 * `kind`. Scores render only when the assessment allows showing results.
 */
export function AssessmentList({
  kind,
  emptyTitle,
  emptyDescription,
}: {
  kind: "tasks" | "quizzes";
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/learner/assessments", kind],
    queryFn: () => api<LearnerAssessment[]>(`/api/learner/assessments?kind=${kind}`),
  });

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  if (!data?.length) {
    return <EmptyState icon={ClipboardCheckIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-(length:--fs-table-body)">
          <thead>
            <tr className="border-b text-left text-(length:--fs-table-header) leading-4 uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Course</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium text-right">Questions</th>
              <th className="px-4 py-2 font-medium text-right">Time</th>
              <th className="px-4 py-2 font-medium text-right">Attempts</th>
              <th className="px-4 py-2 font-medium text-right">Best score</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last attempt</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 font-medium">{a.title}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.courseTitle ?? "—"}</td>
                <td className="px-4 py-2.5"><Badge variant="secondary" className="capitalize">{a.kind}</Badge></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{a.questionCount}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtDuration(a.timeLimitMin)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {a.attemptsUsed}/{a.maxAttempts}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {a.showResults && a.bestScore != null ? `${a.bestScore}%` : "—"}
                </td>
                <td className="px-4 py-2.5"><StatusBadge value={assessStatus(a)} /></td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {a.lastSubmittedAt ? fmtDateTime(a.lastSubmittedAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
