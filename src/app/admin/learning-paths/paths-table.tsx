"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { LearningPathRow, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDate } from "@/lib/format";

const cols: ColumnDef<LearningPathRow, unknown>[] = [
  { id: "title", accessorKey: "title", header: "Path", meta: { sortKey: "title" }, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "courseCount", accessorKey: "courseCount", header: "Courses", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
  { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
];

export function PathsTable() {
  return (
    <ModuleTable<LearningPathRow>
      endpoint="/api/admin/learning-paths"
      columns={cols}
      searchPlaceholder="Search paths…"
      filters={[{ param: "status", placeholder: "Status", allLabel: "All statuses", options: [
        { value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" },
      ], className: "w-36" }]}
      emptyTitle="No learning paths"
      emptyDescription="Combine courses into guided learning paths."
    />
  );
}

export function PathActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon className="group-hover/button:translate-x-0.5" /> New path</Button>
      <CreatePath open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreatePath({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = React.useState("");
  const [courses, setCourses] = React.useState<OptionItem[]>([]);
  const create = useApiMutation({
    mutationFn: () =>
      api("/api/admin/learning-paths", {
        method: "POST",
        body: JSON.stringify({ title, courseIds: courses.map((c) => c.id) }),
      }),
    invalidate: [["/api/admin/learning-paths"]],
    successToast: "Learning path created",
    onSuccess: () => { onOpenChange(false); setTitle(""); setCourses([]); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New learning path</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
          <div className="flex flex-col gap-1.5">
            <Label>Courses (in order added)</Label>
            <AsyncCombobox resource="courses" mode="multi" value={courses} onChange={(v) => setCourses(v as OptionItem[])} placeholder="Add courses…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title || create.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
