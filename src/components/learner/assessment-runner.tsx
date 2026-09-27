"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon, CheckCircle2Icon, CircleIcon, ClipboardCheckIcon,
  ClockIcon, SquareCheckIcon, SquareIcon, TimerIcon, XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type {
  LearnerAssessmentDetail, LearnerAttemptResult, LearnerAttemptStart,
} from "@/lib/learner-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDateTime, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Take = { attemptId: number; attemptNo: number; deadline: number; questions: LearnerAttemptStart["questions"] };

export function AssessmentRunner({ assessmentId }: { assessmentId: number }) {
  const [view, setView] = React.useState<"detail" | "take" | "result">("detail");
  const [take, setTake] = React.useState<Take | null>(null);
  const [result, setResult] = React.useState<LearnerAttemptResult | null>(null);
  const [answers, setAnswers] = React.useState<Record<number, number[]>>({});
  const [submission, setSubmission] = React.useState("");
  const [remaining, setRemaining] = React.useState<number | null>(null);

  const detail = useQuery({
    queryKey: ["/api/learner/assessments", assessmentId],
    queryFn: () => api<LearnerAssessmentDetail>(`/api/learner/assessments/${assessmentId}`),
  });

  const startMut = useApiMutation<LearnerAttemptStart, void>({
    mutationFn: () =>
      api(`/api/learner/assessments/${assessmentId}/attempts`, { method: "POST" }),
    onSuccess: (res) => {
      setAnswers({});
      setSubmission("");
      setTake(res);
      setView("take");
    },
  });

  const submitMut = useApiMutation<LearnerAttemptResult, { attemptId: number; submission?: string }>({
    mutationFn: ({ attemptId, submission }) =>
      api(`/api/learner/assessments/${assessmentId}/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify(submission !== undefined ? { submission } : { answers }),
      }),
    invalidate: [["/api/learner/assessments"], ["/api/learner/dashboard"]],
    onSuccess: (res) => {
      setResult(res);
      setTake(null);
      setView("result");
    },
  });
  // countdown → auto-submit at zero (server enforces deadline regardless);
  // submitMut.mutate is referentially stable, safe as an effect dep
  const { mutate: submit } = submitMut;
  React.useEffect(() => {
    if (view !== "take" || !take) return;
    const tick = () => {
      const left = take.deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) submit({ attemptId: take.attemptId });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [view, take, submit]);

  const openAttempt = useApiMutation<LearnerAttemptResult, number>({
    mutationFn: (attemptId) =>
      api(`/api/learner/assessments/${assessmentId}/attempts/${attemptId}`),
    onSuccess: (res) => {
      if (res.status === "in_progress" && res.questions && res.deadline) {
        setAnswers({});
        setTake({
          attemptId: res.attemptId, attemptNo: res.attemptNo,
          deadline: res.deadline, questions: res.questions,
        });
        setView("take");
      } else {
        setResult(res);
        setView("result");
      }
    },
  });

  if (detail.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="Assessment unavailable"
        description="This assessment doesn't exist, isn't published, or you're not enrolled."
      />
    );
  }

  const { assessment, attempts, activeAttemptId, canAttempt, attemptsUsed } = detail.data;

  if (view === "take" && take) {
    const mm = remaining != null ? Math.floor(remaining / 60000) : 0;
    const ss = remaining != null ? Math.floor((remaining % 60000) / 1000) : 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-(length:--fs-page-title) font-semibold tracking-tight">
              {assessment.title}
            </h1>
            <p className="text-(length:--fs-page-desc) text-muted-foreground">
              Attempt {take.attemptNo} · pass at {assessment.passingScore}%
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 tabular-nums",
              remaining != null && remaining < 60_000 && "border-destructive/40 text-destructive"
            )}
          >
            <TimerIcon className="size-3.5" />
            {mm}:{String(ss).padStart(2, "0")}
          </Badge>
        </div>

        {assessment.kind === "assignment" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your submission</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                rows={10}
                placeholder="Paste your work here — text, links, or a repo URL."
              />
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                {submission.length.toLocaleString()} / 20,000 characters
              </p>
            </CardContent>
          </Card>
        ) : (
        <div className="flex flex-col gap-3">
          {take.questions.map((q, qi) => {
            const sel = answers[q.id] ?? [];
            const setSel = (next: number[]) => setAnswers((a) => ({ ...a, [q.id]: next }));
            return (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-baseline gap-2 text-sm font-medium">
                    <span className="text-muted-foreground">{qi + 1}.</span>
                    <span className="flex-1">{q.prompt}</span>
                    <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                      {q.points} pt{q.points === 1 ? "" : "s"}
                      {q.type === "multi" && " · select all that apply"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5 pt-0">
                  {q.options.map((opt, oi) => {
                    const on = sel.includes(oi);
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() =>
                          setSel(
                            q.type === "multi"
                              ? on ? sel.filter((x) => x !== oi) : [...sel, oi]
                              : [oi]
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors duration-(--duration-fast)",
                          on ? "border-primary/50 bg-primary/5" : "hover:bg-muted"
                        )}
                      >
                        {q.type === "multi" ? (
                          on ? <SquareCheckIcon className="size-4 text-primary" />
                             : <SquareIcon className="size-4 text-muted-foreground" />
                        ) : (
                          on ? <CheckCircle2Icon className="size-4 text-primary" />
                             : <CircleIcon className="size-4 text-muted-foreground" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          {assessment.kind === "assignment" ? (
            <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
              Your work is graded by an instructor after submission.
            </p>
          ) : (
            <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
              {Object.keys(answers).length} of {take.questions.length} answered
            </p>
          )}
          <Button
            disabled={
              submitMut.isPending ||
              (assessment.kind === "assignment" && !submission.trim())
            }
            onClick={() =>
              submitMut.mutate(
                assessment.kind === "assignment"
                  ? { attemptId: take.attemptId, submission }
                  : { attemptId: take.attemptId }
              )
            }
          >
            {assessment.kind === "assignment" ? "Submit work" : "Submit attempt"}
          </Button>
        </div>
      </div>
    );
  }

  if (view === "result" && result) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <h1 className="text-(length:--fs-page-title) font-semibold tracking-tight">
                {assessment.title}
              </h1>
              <p className="mt-0.5 text-(length:--fs-page-desc) text-muted-foreground">
                Attempt {result.attemptNo}
                {result.submittedAt ? ` · ${fmtDateTime(result.submittedAt)}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums">
                {result.status === "expired" || result.pendingGrade ? "—" : `${result.score}%`}
              </p>
              <StatusBadge
                value={
                  result.status === "expired"
                    ? "expired"
                    : result.pendingGrade
                      ? "pending-grade"
                      : result.passed
                        ? "passed"
                        : "failed"
                }
              />
            </div>
          </CardContent>
        </Card>

        {result.pendingGrade && (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">Submitted — awaiting grade</p>
              <p className="mt-1 text-sm text-muted-foreground">
                An instructor will review your work and post a score.
              </p>
            </CardContent>
          </Card>
        )}

        {result.gradedAt != null && result.feedback && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Instructor feedback</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result.feedback}</p>
            </CardContent>
          </Card>
        )}

        {result.submission != null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your submission</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result.submission}</p>
            </CardContent>
          </Card>
        )}

        {result.review ? (
          <div className="flex flex-col gap-3">
            {result.review.map((r, i) => {
              const right = r.selected.length > 0 && r.correct.join() === r.selected.join();
              return (
                <Card key={r.questionId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-baseline gap-2 text-sm font-medium">
                      {right ? (
                        <CheckCircle2Icon className="size-4 text-emerald-600" />
                      ) : (
                        <XCircleIcon className="size-4 text-destructive" />
                      )}
                      <span className="flex-1">{i + 1}. {r.prompt}</span>
                      <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                        {r.pointsEarned} pts
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 pt-0">
                    {r.options.map((opt, oi) => {
                      const isCorrect = r.correct.includes(oi);
                      const picked = r.selected.includes(oi);
                      return (
                        <div
                          key={oi}
                          className={cn(
                            "rounded-md border px-3 py-2 text-sm",
                            isCorrect && "border-emerald-500/40 bg-emerald-500/5",
                            picked && !isCorrect && "border-destructive/40 bg-destructive/5",
                            !isCorrect && !picked && "border-transparent text-muted-foreground"
                          )}
                        >
                          {opt}
                          {picked && !isCorrect && " — your answer"}
                          {isCorrect && " — correct"}
                        </div>
                      );
                    })}
                    {r.selected.length === 0 && (
                      <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">Not answered</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          !result.showResults && (
            <p className="text-sm text-muted-foreground">
              Results breakdown is hidden for this assessment.
            </p>
          )
        )}

        <div>
          <Button variant="outline" size="sm" onClick={() => setView("detail")}>
            <ArrowLeftIcon /> Back to assessment
          </Button>
        </div>
      </div>
    );
  }

  // detail view
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-(length:--fs-page-title) font-semibold tracking-tight">
              {assessment.title}
            </h1>
            <Badge variant="secondary" className="capitalize">{assessment.kind}</Badge>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--fs-page-desc) text-muted-foreground">
            {assessment.courseTitle && (
              <Link href={`/learner/courses/${assessment.courseId}` as never} className="hover:text-foreground hover:underline">
                {assessment.courseTitle}
              </Link>
            )}
            <span className="inline-flex items-center gap-1"><ClipboardCheckIcon className="size-3.5" />{assessment.questionCount} questions</span>
            <span className="inline-flex items-center gap-1"><ClockIcon className="size-3.5" />{fmtDuration(assessment.timeLimitMin)}</span>
            <span>Pass at {assessment.passingScore}%</span>
          </p>
        </div>
        {activeAttemptId != null ? (
          <Button onClick={() => openAttempt.mutate(activeAttemptId)} disabled={openAttempt.isPending}>
            Resume attempt
          </Button>
        ) : canAttempt ? (
          <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
            Start attempt
          </Button>
        ) : (
          <Badge variant="outline">No attempts remaining</Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Your attempts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No attempts yet — you have {assessment.maxAttempts} available.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-(length:--fs-meta) leading-4 uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Attempt</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Score</th>
                  <th className="px-4 py-2 font-medium">Submitted</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 tabular-nums">#{t.attemptNo}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge value={t.pendingGrade ? "pending-grade" : t.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {t.status === "in_progress" || t.status === "expired" || t.pendingGrade
                        ? "—"
                        : `${t.score}%`}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {t.submittedAt ? fmtDateTime(t.submittedAt) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => openAttempt.mutate(t.id)}
                      >
                        {t.status === "in_progress" ? "Resume" : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
        {attemptsUsed} of {assessment.maxAttempts} attempts used
      </p>
    </div>
  );
}
