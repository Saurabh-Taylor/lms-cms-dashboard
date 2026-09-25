"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AssessmentRow } from "@/lib/types";
import { ModuleTable, type FilterDef } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtRelative } from "@/lib/format";

const KINDS = [
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
];
const STATUS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export function AssessmentsTable({ fixedKind }: { fixedKind?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/assessments"] });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api(`/api/admin/assessments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/admin/assessments/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<AssessmentRow, unknown>[]>(() => [
    {
      id: "title", accessorKey: "title", header: "Assessment",
      meta: { sortKey: "title" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{row.original.title}</span>
          <span className="text-xs capitalize text-muted-foreground">{row.original.kind} · {row.original.questionCount} questions</span>
        </div>
      ),
    },
    {
      id: "courseTitle", accessorKey: "courseTitle", header: "Course",
      cell: ({ row }) => row.original.courseTitle ? (
        <Link href={`/admin/courses/${row.original.courseId}` as never} className="block max-w-48 truncate text-sm hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.original.courseTitle}
        </Link>
      ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    { id: "passingScore", accessorKey: "passingScore", header: "Pass ≥", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}%</span> },
    { id: "attemptCount", accessorKey: "attemptCount", header: "Attempts", meta: { sortKey: "attemptCount", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span> },
    { id: "avgScore", accessorKey: "avgScore", header: "Avg score", meta: { sortKey: "avgScore", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}%</span> },
    { id: "passRate", accessorKey: "passRate", header: "Pass rate", meta: { sortKey: "passRate", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}%</span> },
    { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
    {
      id: "_actions", enableHiding: false, meta: { className: "w-8" },
      cell: ({ row }) => {
        const a = row.original;
        return (
          <RowActions items={[
            { label: "Edit", onClick: () => router.push(`/admin/assessments/${a.id}` as never) },
            a.status !== "published"
              ? { label: "Publish", onClick: () => patch.mutate({ id: a.id, body: { status: "published" } }) }
              : { label: "Unpublish", onClick: () => patch.mutate({ id: a.id, body: { status: "draft" } }) },
            { label: "Archive", onClick: () => patch.mutate({ id: a.id, body: { status: "archived" } }) },
            { label: "Delete", destructive: true, separatorAbove: true, onClick: () => del.mutate(a.id) },
          ]} />
        );
      },
    },
  ], [router, patch, del]);

  const filters: FilterDef[] = [
    { param: "status", placeholder: "Status", allLabel: "All statuses", options: STATUS, className: "w-36" },
  ];
  if (!fixedKind) filters.unshift({ param: "kind", placeholder: "Type", allLabel: "All types", options: KINDS, className: "w-36" });

  return (
    <ModuleTable<AssessmentRow>
      endpoint="/api/admin/assessments"
      columns={columns}
      searchPlaceholder="Search assessments…"
      filters={filters}
      fixed={fixedKind ? { kind: fixedKind } : undefined}
      onRowClick={(r) => router.push(`/admin/assessments/${r.id}` as never)}
      emptyTitle={fixedKind === "assignment" ? "No assignments" : "No assessments"}
      emptyDescription="Create quizzes, exams and assignments to measure learner progress."
    />
  );
}

export function AssessmentActions({ defaultKind }: { defaultKind?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New {defaultKind ?? "assessment"}
      </Button>
      <CreateDialog open={open} onOpenChange={setOpen} defaultKind={defaultKind ?? "quiz"} />
    </>
  );
}

function CreateDialog({ open, onOpenChange, defaultKind }: { open: boolean; onOpenChange: (v: boolean) => void; defaultKind: string }) {
  const qc = useQueryClient();
  const [f, setF] = React.useState({
    title: "", kind: defaultKind, passingScore: 70, maxAttempts: 1,
    timeLimitMin: 30, shuffleQuestions: false, showResults: true,
  });
  const [course, setCourse] = React.useState<{ id: number; label: string } | null>(null);

  const [prevKind, setPrevKind] = React.useState(defaultKind);
  if (prevKind !== defaultKind) {
    setPrevKind(defaultKind);
    setF((p) => ({ ...p, kind: defaultKind }));
  }

  const create = useMutation({
    mutationFn: () =>
      api("/api/admin/assessments", {
        method: "POST",
        body: JSON.stringify({ ...f, courseId: course?.id }),
      }),
    onSuccess: () => {
      toast.success(`${f.kind} created as draft`);
      qc.invalidateQueries({ queryKey: ["/api/admin/assessments"] });
      onOpenChange(false);
      setF({ title: "", kind: defaultKind, passingScore: 70, maxAttempts: 1, timeLimitMin: 30, shuffleQuestions: false, showResults: true });
      setCourse(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New {f.kind}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: String(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Course (optional)</Label>
              <AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as typeof course)} placeholder="Link course…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Passing score %</Label>
              <Input type="number" min={0} max={100} value={f.passingScore} onChange={(e) => setF({ ...f, passingScore: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Max attempts</Label>
              <Input type="number" min={1} value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Time limit (min)</Label>
              <Input type="number" min={1} value={f.timeLimitMin} onChange={(e) => setF({ ...f, timeLimitMin: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.shuffleQuestions} onCheckedChange={(v) => setF({ ...f, shuffleQuestions: !!v })} />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.showResults} onCheckedChange={(v) => setF({ ...f, showResults: !!v })} />
              Show results to learner
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!f.title || create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
