"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { LearningPathRow, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDate } from "@/lib/format";

const cols: ColumnDef<LearningPathRow, unknown>[] = [
  { id: "title", accessorKey: "title", header: "Path", meta: { sortKey: "title" }, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "courseCount", accessorKey: "courseCount", header: "Courses", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
  { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
  { id: "actions", enableSorting: false, meta: { className: "w-10" }, cell: ({ row }) => <PathRowActions path={row.original} /> },
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
      {open && <PathDialog path={null} onClose={() => setOpen(false)} />}
    </>
  );
}

function PathRowActions({ path }: { path: LearningPathRow }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <RowActions items={[{ label: "Edit", onClick: () => setOpen(true) }]} />
      {open && <PathDialog path={path} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Create (path=null) or edit (path set) — title/description/status + ordered courses. */
function PathDialog({ path, onClose }: { path: LearningPathRow | null; onClose: () => void }) {
  const [title, setTitle] = React.useState(path?.title ?? "");
  const [description, setDescription] = React.useState(path?.description ?? "");
  const [status, setStatus] = React.useState<string>(path?.status ?? "draft");
  const [picked, setPicked] = React.useState<OptionItem[] | null>(null);

  // Edit mode: resolve labels for the path's courseIds, restoring path order.
  const wantIds = path?.courseIds ?? [];
  const prefillQ = useQuery({
    queryKey: ["options", "courses", "byIds", wantIds],
    queryFn: () =>
      api<OptionItem[]>(`/api/admin/options?resource=courses&ids=${wantIds.join(",")}`),
    enabled: wantIds.length > 0,
    staleTime: 60_000,
  });
  const [seen, setSeen] = React.useState<OptionItem[] | undefined>(undefined);
  if (prefillQ.data !== seen) {
    setSeen(prefillQ.data);
    const byId = new Map((prefillQ.data ?? []).map((o) => [o.id, o]));
    setPicked(wantIds.map((id) => byId.get(id)).filter((o): o is OptionItem => !!o));
  }
  const courses = picked ?? [];
  // Block save until labels resolve — submitting early would send courseIds: [] and wipe contents.
  const loading = wantIds.length > 0 && !prefillQ.isSuccess && picked === null;

  const save = useApiMutation({
    mutationFn: () => {
      if (!path)
        return api("/api/admin/learning-paths", {
          method: "POST",
          body: JSON.stringify({ title, description: description || null, courseIds: courses.map((c) => c.id) }),
        });
      // Sparse diff — sending unchanged courseIds would trip the publish gate
      // on pre-existing published paths that contain drafts.
      const body: Record<string, unknown> = {};
      if (title !== path.title) body.title = title;
      if ((description || null) !== path.description) body.description = description || null;
      if (status !== path.status) body.status = status;
      const nextIds = courses.map((c) => c.id);
      if (JSON.stringify(nextIds) !== JSON.stringify(wantIds)) body.courseIds = nextIds;
      return api(`/api/admin/learning-paths/${path.id}`, { method: "PATCH", body: JSON.stringify(body) });
    },
    invalidate: [["/api/admin/learning-paths"]],
    successToast: path ? "Learning path updated" : "Learning path created",
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{path ? "Edit learning path" : "New learning path"}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          {path && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(String(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Courses (in order added)</Label>
            <AsyncCombobox
              resource="courses"
              mode="multi"
              value={courses}
              onChange={(v) => setPicked(v as OptionItem[])}
              placeholder={loading ? "Loading courses…" : "Add courses…"}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!title || loading || save.isPending}>{path ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
