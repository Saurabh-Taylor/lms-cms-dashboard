"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  id: number;
  assessmentId: number;
  position: number;
  prompt: string;
  type: "single" | "multi" | "tf";
  options: string[];
  correct: number[];
  points: number;
}

const TYPE_LABEL: Record<Question["type"], string> = {
  single: "Single choice",
  multi: "Multi select",
  tf: "True / False",
};

function questionsKey(id: number) {
  return [`/api/admin/assessments/${id}/questions`] as const;
}

function QuestionFormDialog({
  assessmentId, question, open, onOpenChange,
}: {
  assessmentId: number;
  question: Question | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const editing = question !== null;
  const [prompt, setPrompt] = React.useState("");
  const [type, setType] = React.useState<Question["type"]>("single");
  const [options, setOptions] = React.useState<string[]>(["", ""]);
  const [correct, setCorrect] = React.useState<number[]>([]);
  const [points, setPoints] = React.useState(1);

  // render-phase state seed — a new dialog session (open × target) resets the form
  const sessionKey = open ? `edit-${question?.id ?? "new"}` : "closed";
  const [prevSession, setPrevSession] = React.useState(sessionKey);
  if (prevSession !== sessionKey) {
    setPrevSession(sessionKey);
    setPrompt(question?.prompt ?? "");
    setType(question?.type ?? "single");
    setOptions(question?.options ?? ["", ""]);
    setCorrect(question?.correct ?? []);
    setPoints(question?.points ?? 1);
  }

  const isTf = type === "tf";
  const effOptions = isTf ? ["True", "False"] : options;
  const valid =
    prompt.trim().length > 0 &&
    effOptions.every((o) => o.trim().length > 0) &&
    correct.length >= 1 &&
    (type === "multi" || correct.length === 1) &&
    correct.every((i) => i < effOptions.length);

  const save = useApiMutation({
    mutationFn: () =>
      api<Question>(
        editing
          ? `/api/admin/assessments/${assessmentId}/questions/${question.id}`
          : `/api/admin/assessments/${assessmentId}/questions`,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            prompt: prompt.trim(),
            type,
            options: effOptions.map((o) => o.trim()),
            correct,
            points,
          }),
        },
      ),
    invalidate: [questionsKey(assessmentId)],
    successToast: editing ? "Question updated" : "Question added",
    onSuccess: () => onOpenChange(false),
  });

  function toggleCorrect(i: number) {
    if (type === "multi") {
      setCorrect((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i].sort()));
    } else {
      setCorrect([i]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>
            {editing ? "Changes apply to future attempts." : "Appended to the end of the bank."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qb-prompt">Prompt</Label>
            <Textarea id="qb-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const t = v as Question["type"];
                  setType(t);
                  setCorrect([]);
                  if (t === "multi" && options.length < 3) setOptions((o) => [...o, ""]);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single choice</SelectItem>
                  <SelectItem value="multi">Multi select</SelectItem>
                  <SelectItem value="tf">True / False</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qb-points">Points</Label>
              <Input
                id="qb-points" type="number" min={1} value={points}
                onChange={(e) => setPoints(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{isTf ? "Correct answer" : "Options — mark the correct one(s)"}</Label>
            <div className="flex flex-col gap-2">
              {effOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    checked={correct.includes(i)}
                    onCheckedChange={() => toggleCorrect(i)}
                    aria-label={`Correct option ${i + 1}`}
                  />
                  {isTf ? (
                    <span className="text-sm">{opt}</span>
                  ) : (
                    <Input
                      value={opt}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) =>
                        setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))
                      }
                    />
                  )}
                  {!isTf && options.length > 2 && (
                    <Button
                      type="button" variant="ghost" size="icon-sm"
                      onClick={() => {
                        setOptions((o) => o.filter((_, j) => j !== i));
                        setCorrect((c) =>
                          c.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))
                        );
                      }}
                      aria-label="Remove option"
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!isTf && options.length < 10 && (
              <Button
                type="button" variant="outline" size="sm" className="mt-1 self-start"
                onClick={() => setOptions((o) => [...o, ""])}
              >
                <PlusIcon /> Add option
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Add question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionBank({ assessmentId }: { assessmentId: number }) {
  const query = useQuery({
    queryKey: questionsKey(assessmentId),
    queryFn: () => api<Question[]>(`/api/admin/assessments/${assessmentId}/questions`),
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Question | null>(null);
  const [deleting, setDeleting] = React.useState<Question | null>(null);

  const remove = useApiMutation({
    mutationFn: (q: Question) =>
      api(`/api/admin/assessments/${assessmentId}/questions/${q.id}`, { method: "DELETE" }),
    invalidate: [questionsKey(assessmentId)],
    successToast: "Question deleted",
    onSuccess: () => setDeleting(null),
  });

  const questions = query.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Question bank · {questions.length}
        </h2>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <PlusIcon /> Add question
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No questions yet — add the first one to build the bank.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">#{qi + 1}</span>
                    <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{q.points} pt{q.points === 1 ? "" : "s"}</span>
                  </div>
                  <p className="text-sm font-medium">{q.prompt}</p>
                  <ul className="flex flex-col gap-1">
                    {q.options.map((opt, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-sm">
                        {q.correct.includes(i) ? (
                          <CheckIcon className="size-3.5 text-emerald-600" />
                        ) : (
                          <span className="size-3.5" />
                        )}
                        <span className={q.correct.includes(i) ? "font-medium" : "text-muted-foreground"}>
                          {opt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost" size="icon-sm" aria-label="Edit question"
                    onClick={() => { setEditing(q); setFormOpen(true); }}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost" size="icon-sm" aria-label="Delete question"
                    onClick={() => setDeleting(q)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuestionFormDialog
        assessmentId={assessmentId}
        question={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete question?"
        description={`"${deleting?.prompt.slice(0, 80) ?? ""}" will be removed from the bank. Past attempts keep their recorded scores.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}
