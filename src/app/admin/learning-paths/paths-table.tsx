"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { bulkToast } from "@/lib/bulk-results";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usePermissions } from "@/hooks/use-me";
import { LIST_PAGE_SIZE_MAX, type AssignLearningPathResult } from "@microshala/contracts";
import { PERM } from "@/lib/permissions";
import { qk } from "@/lib/query-keys";
import type { LearningPathRow, ListResponse, OptionItem, PathAssignmentRow } from "@/lib/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtDate } from "@/lib/format";

const buildCols = (canAssign: boolean): ColumnDef<LearningPathRow, unknown>[] => [
  { id: "title", accessorKey: "title", header: "Path", meta: { sortKey: "title" }, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "courseCount", accessorKey: "courseCount", header: "Courses", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
  { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
  { id: "actions", enableSorting: false, meta: { className: "w-10" }, cell: ({ row }) => <PathRowActions path={row.original} canAssign={canAssign} /> },
];

export function PathsTable() {
  // Permissions drive which actions render — the proxy enforces them regardless.
  const canAssign = usePermissions().has(PERM.pathAssign);
  const columns = React.useMemo(() => buildCols(canAssign), [canAssign]);
  return (
    <ModuleTable<LearningPathRow>
      endpoint="/api/admin/learning-paths"
      columns={columns}
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

function PathRowActions({ path, canAssign }: { path: LearningPathRow; canAssign: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  return (
    <>
      <RowActions items={[
        { label: "Edit", onClick: () => setOpen(true) },
        ...(canAssign ? [{ label: "Assign…", onClick: () => setAssignOpen(true) }] : []),
      ]} />
      {open && <PathDialog path={path} onClose={() => setOpen(false)} />}
      {assignOpen && <AssignPathDialog path={path} onClose={() => setAssignOpen(false)} />}
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
            <Button size="sm" type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={!title || loading || save.isPending}>{path ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Assign the path to learners/cohorts + review or revoke existing assignments. */
function AssignPathDialog({ path, onClose }: { path: LearningPathRow; onClose: () => void }) {
  const [learners, setLearners] = React.useState<OptionItem[]>([]);
  const [cohorts, setCohorts] = React.useState<OptionItem[]>([]);
  const listKey = qk.pathAssignments(path.id);

  const listQ = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) =>
      api<ListResponse<PathAssignmentRow>>(`/api/admin/learning-paths/${path.id}/assignments?page=${pageParam}&pageSize=${LIST_PAGE_SIZE_MAX}`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
  const rows = listQ.data?.pages.flatMap((p) => p.data) ?? [];
  const total = listQ.data?.pages.at(-1)?.total ?? 0;

  const assign = useApiMutation({
    mutationFn: () =>
      api<AssignLearningPathResult>(`/api/admin/learning-paths/${path.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          userIds: learners.map((l) => l.id),
          groupIds: cohorts.map((c) => c.id),
        }),
      }),
    invalidate: [listKey],
    onSuccess: (r) => {
      // reason is informational on ok targets (spec: "Already assigned" is
      // NOT a failure) — partitionBulk reports it as skipped, not fresh.
      bulkToast(r.results, {
        verb: "assigned",
        skippedLabel: "already assigned",
        detail: r.enrolled ? `${r.enrolled} enrollment(s) created` : undefined,
        nothingMessage: "Already assigned — nothing new",
      });
      setLearners([]);
      setCohorts([]);
    },
  });

  const revoke = useApiMutation({
    mutationFn: (assignmentId: number) =>
      api(`/api/admin/learning-paths/${path.id}/assignments/${assignmentId}`, { method: "DELETE" }),
    invalidate: [listKey],
    successToast: "Assignment revoked",
  });

  const published = path.status === "published";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Assign “{path.title}”</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          {!published && (
            <p className="text-sm text-muted-foreground">Publish the path before assigning it to learners.</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Learners</Label>
            <AsyncCombobox resource="learners" mode="multi" value={learners} onChange={(v) => setLearners(v as OptionItem[])} placeholder="Search learners…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cohorts</Label>
            <AsyncCombobox resource="cohorts" mode="multi" value={cohorts} onChange={(v) => setCohorts(v as OptionItem[])} placeholder="Search cohorts…" />
            <p className="text-xs text-muted-foreground">Cohort assignments are live — members who join later are enrolled automatically.</p>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => assign.mutate()} disabled={!published || (!learners.length && !cohorts.length) || assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
          {rows.length > 0 && (
            <div className="flex flex-col gap-1 border-t pt-3">
              <Label>Current assignments</Label>
              <p className="text-xs text-muted-foreground">Revoking removes the assignment; existing enrollments stay.</p>
              <ScrollArea className="max-h-64">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                    <span className="truncate">
                      {r.name}
                      <span className="text-muted-foreground">
                        {" · "}{r.targetType === "group" ? "cohort" : "learner"}
                        {r.email ? ` · ${r.email}` : ""}
                        {" · by "}{r.assignedByName ?? "—"} · {fmtDate(r.createdAt)}
                      </span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(r.id)} disabled={revoke.isPending && revoke.variables === r.id}>Revoke</Button>
                  </div>
                ))}
              </ScrollArea>
              {listQ.hasNextPage && (
                <Button size="sm" variant="outline" onClick={() => listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}>
                  {listQ.isFetchingNextPage ? "Loading…" : `Show more (${total - rows.length} remaining)`}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
