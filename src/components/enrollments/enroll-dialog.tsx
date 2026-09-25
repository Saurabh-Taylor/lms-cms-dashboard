"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { OptionItem } from "@/lib/types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface EnrollResult {
  userId: number; courseId: number; ok: boolean; reason?: string;
}

export function SingleEnrollDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [user, setUser] = React.useState<OptionItem | null>(null);
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const [expiry, setExpiry] = React.useState("");

  const mut = useMutation({
    mutationFn: () =>
      api<{ succeeded: number; results: EnrollResult[] }>("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify({
          userId: user!.id, courseId: course!.id,
          expiresAt: expiry ? new Date(expiry).getTime() : undefined,
        }),
      }),
    onSuccess: (r) => {
      if (r.succeeded) { toast.success("Enrollment created"); onOpenChange(false); }
      else toast.warning(r.results[0]?.reason ?? "Not enrolled");
      qc.invalidateQueries({ queryKey: ["/api/admin/enrollments"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New enrollment</DialogTitle>
          <DialogDescription>Enroll a single learner into a course.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Learner</Label>
            <AsyncCombobox resource="learners" value={user} onChange={(v) => setUser(v as OptionItem | null)} placeholder="Search learners…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Course</Label>
            <AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as OptionItem | null)} placeholder="Search courses…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Expires (optional)</Label>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mut.mutate()} disabled={!user || !course || mut.isPending}>
              {mut.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type BulkPhase = "select" | "processing" | "done";

export function BulkEnrollDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [learners, setLearners] = React.useState<OptionItem[]>([]);
  const [courses, setCourses] = React.useState<OptionItem[]>([]);
  const [phase, setPhase] = React.useState<BulkPhase>("select");
  const [results, setResults] = React.useState<EnrollResult[]>([]);
  const [, setRetryIds] = React.useState<number[]>([]);

  const learnerName = React.useCallback(
    (id: number) => learners.find((l) => l.id === id)?.label ?? `User ${id}`,
    [learners]
  );
  const courseName = React.useCallback(
    (id: number) => courses.find((c) => c.id === id)?.label ?? `Course ${id}`,
    [courses]
  );

  const run = useMutation({
    mutationFn: (userIds: number[]) =>
      api<{ succeeded: number; failed: number; results: EnrollResult[] }>("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify({ userIds, courseIds: courses.map((c) => c.id) }),
      }),
    onSuccess: (r, userIds) => {
      setResults((prev) => {
        // merge retry results back over previous failures
        const byUser = new Map<number, EnrollResult>();
        for (const p of prev) if (!userIds.includes(p.userId) || p.ok) byUser.set(`${p.userId}:${p.courseId}` as never, p);
        for (const n of r.results) byUser.set(`${n.userId}:${n.courseId}` as never, n);
        return [...byUser.values()];
      });
      setPhase("done");
      qc.invalidateQueries({ queryKey: ["/api/admin/enrollments"] });
      if (!r.failed) toast.success(`${r.succeeded} enrollment(s) created`);
      else toast.warning(`${r.succeeded} created, ${r.failed} failed`);
    },
    onError: (e) => { toast.error(e.message); setPhase("select"); },
  });

  const failed = results.filter((r) => !r.ok);

  const reset = () => { setPhase("select"); setResults([]); setLearners([]); setCourses([]); setRetryIds([]); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk enroll learners</DialogTitle>
          <DialogDescription>
            Select learners and one or more courses. Every learner is enrolled into every selected course.
          </DialogDescription>
        </DialogHeader>

        {phase === "select" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Learners ({learners.length})</Label>
              <AsyncCombobox resource="learners" mode="multi" value={learners} onChange={(v) => setLearners(v as OptionItem[])} placeholder="Search learners…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Courses ({courses.length})</Label>
              <AsyncCombobox resource="courses" mode="multi" value={courses} onChange={(v) => setCourses(v as OptionItem[])} placeholder="Search courses…" />
            </div>
            {learners.length > 0 && courses.length > 0 && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                Will create up to <strong>{learners.length * courses.length}</strong> enrollments.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => { setPhase("processing"); run.mutate(learners.map((l) => l.id)); }}
                disabled={!learners.length || !courses.length}
              >
                Enroll {learners.length} × {courses.length}
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="text-sm text-muted-foreground">
              Creating {learners.length * courses.length} enrollments…
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <strong>{results.filter((r) => r.ok).length}</strong> succeeded ·{" "}
              <strong className={failed.length ? "text-destructive" : ""}>{failed.length}</strong> failed
            </p>
            <ScrollArea className="max-h-64 rounded-md border">
              <ul className="divide-y text-sm">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-2">
                    {r.ok ? (
                      <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircleIcon className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {learnerName(r.userId)} → {courseName(r.courseId)}
                    </span>
                    {!r.ok && <span className="shrink-0 text-(length:--fs-meta) leading-4 text-muted-foreground">{r.reason}</span>}
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <DialogFooter>
              {failed.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const ids = [...new Set(failed.map((f) => f.userId))];
                    setPhase("processing");
                    run.mutate(ids);
                  }}
                >
                  Retry {failed.length} failed
                </Button>
              )}
              <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
