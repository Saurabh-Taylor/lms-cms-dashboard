"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/components/shared/local-list-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AttemptRow {
  id: number; userId: number; userName: string; attemptNo: number;
  kind: string; status: string; score: number; passed: boolean;
  submittedAt: number; submission: string | null; feedback: string | null;
  gradedAt: number | null; passingScore: number;
}

function GradeDialog({
  attempt, open, onOpenChange,
}: {
  attempt: AttemptRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [score, setScore] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const sessionKey = open ? `grade-${attempt?.id}` : "closed";
  const [prevSession, setPrevSession] = React.useState(sessionKey);
  if (prevSession !== sessionKey) {
    setPrevSession(sessionKey);
    setScore(attempt?.gradedAt != null ? attempt.score : 0);
    setFeedback(attempt?.feedback ?? "");
  }

  const grade = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/attempts/${attempt!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ score, feedback: feedback || undefined }),
      }),
    invalidate: [["/api/admin/attempts"], ["/api/admin/analytics"]],
    successToast: "Grade saved",
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grade submission</DialogTitle>
          <DialogDescription>
            {attempt?.userName} · attempt #{attempt?.attemptNo} · pass at {attempt?.passingScore}%
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); grade.mutate(); }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Submission</Label>
            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
              {attempt?.submission ?? ""}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gd-score">Score (0–100)</Label>
            <Input
              id="gd-score" type="number" min={0} max={100} required
              value={score}
              onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gd-feedback">Feedback (optional)</Label>
            <Textarea
              id="gd-feedback" rows={3} value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Shown to the learner with their score."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={grade.isPending}>
              {grade.isPending ? "Saving…" : attempt?.gradedAt != null ? "Update grade" : "Save grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssessmentDetail({ id }: { id: number }) {
  const [grading, setGrading] = React.useState<AttemptRow | null>(null);
  const [gradeOpen, setGradeOpen] = React.useState(false);

  const cols: ColumnDef<AttemptRow, unknown>[] = React.useMemo(() => [
    { id: "userName", accessorKey: "userName", header: "Learner", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { id: "attemptNo", accessorKey: "attemptNo", header: "Attempt", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">#{getValue() as number}</span> },
    { id: "score", accessorKey: "score", header: "Score", meta: { className: "text-right", headerClassName: "text-right" },
      cell: ({ row, getValue }) => {
        const a = row.original;
        if (a.kind === "assignment" && a.gradedAt == null)
          return <span className="text-muted-foreground">—</span>;
        return <span className="tabular-nums font-medium">{getValue() as number}%</span>;
      } },
    { id: "passed", accessorKey: "passed", header: "Result",
      cell: ({ row }) => {
        const a = row.original;
        if (a.status === "in_progress") return <StatusBadge value="in progress" />;
        if (a.status === "expired") return <StatusBadge value="expired" />;
        if (a.kind === "assignment" && a.gradedAt == null) return <StatusBadge value="pending-grade" />;
        return <StatusBadge value={a.passed ? "passed" : "failed"} />;
      } },
    { id: "submittedAt", accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDateTime(getValue() as number)}</span> },
    { id: "actions", header: "", meta: { className: "text-right", headerClassName: "text-right" },
      cell: ({ row }) => {
        const a = row.original;
        if (a.kind !== "assignment" || a.status !== "submitted") return null;
        return (
          <Button
            variant="outline" size="sm"
            onClick={() => { setGrading(a); setGradeOpen(true); }}
          >
            {a.gradedAt != null ? "Re-grade" : "Grade"}
          </Button>
        );
      } },
  ], []);

  return (
    <>
      <LocalListTable<AttemptRow>
        endpoint="/api/admin/attempts"
        params={{ assessmentId: id }}
        columns={cols}
        emptyTitle="No attempts yet"
        emptyDescription="Learner attempts will appear here."
      />
      <GradeDialog attempt={grading} open={gradeOpen} onOpenChange={setGradeOpen} />
    </>
  );
}
