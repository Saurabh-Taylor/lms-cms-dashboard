"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon, PlusIcon, SearchIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useDebounce } from "@/hooks/use-debounce";
import type { GroupRow, ListResponse, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { AsyncCombobox } from "@/components/async-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate } from "@/lib/format";

const cols: ColumnDef<GroupRow, unknown>[] = [
  { id: "name", accessorKey: "name", header: "Name", meta: { sortKey: "name" }, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "description", accessorKey: "description", header: "Description", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) ?? "—"}</span> },
  { id: "memberCount", accessorKey: "memberCount", header: "Members", meta: { sortKey: "memberCount", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span> },
  { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
  { id: "actions", enableSorting: false, meta: { className: "w-10" }, cell: ({ row }) => <GroupRowActions group={row.original} /> },
];

export function GroupsTable() {
  return (
    <ModuleTable<GroupRow>
      endpoint="/api/admin/groups"
      columns={cols}
      searchPlaceholder="Search cohorts…"
      emptyTitle="No cohorts"
      emptyDescription="Create cohorts to enroll groups of learners at once."
    />
  );
}

export function GroupActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon className="group-hover/button:translate-x-0.5" /> New cohort</Button>
      {open && <GroupDialog group={null} onClose={() => setOpen(false)} />}
    </>
  );
}

function GroupRowActions({ group }: { group: GroupRow }) {
  const [mode, setMode] = React.useState<"members" | "edit" | "delete" | null>(null);
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/groups/${group.id}`, { method: "DELETE" }),
    invalidate: [["/api/admin/groups"]],
    successToast: "Cohort deleted",
    onSuccess: () => setMode(null),
  });
  return (
    <>
      <RowActions items={[
        { label: "Manage members", onClick: () => setMode("members") },
        { label: "Edit", onClick: () => setMode("edit") },
        { label: "Delete", destructive: true, separatorAbove: true, onClick: () => setMode("delete") },
      ]} />
      {mode === "members" && <MembersSheet group={group} onClose={() => setMode(null)} />}
      {mode === "edit" && <GroupDialog group={group} onClose={() => setMode(null)} />}
      {mode === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={() => setMode(null)}
          title={`Delete "${group.name}"?`}
          description={`This removes the cohort and its ${group.memberCount.toLocaleString()} membership rows. Enrollments already created are unaffected.`}
          confirmLabel="Delete"
          destructive
          loading={del.isPending}
          onConfirm={() => del.mutate()}
        />
      )}
    </>
  );
}

/** Create (group=null) or edit (group set) — name + description. */
function GroupDialog({ group, onClose }: { group: GroupRow | null; onClose: () => void }) {
  const [name, setName] = React.useState(group?.name ?? "");
  const [description, setDescription] = React.useState(group?.description ?? "");
  const save = useApiMutation({
    mutationFn: () =>
      api(group ? `/api/admin/groups/${group.id}` : "/api/admin/groups", {
        method: group ? "PATCH" : "POST",
        body: JSON.stringify({ name, description: description || null }),
      }),
    invalidate: [["/api/admin/groups"]],
    successToast: group ? "Cohort updated" : "Cohort created",
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{group ? "Edit cohort" : "New cohort"}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name || save.isPending}>{group ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MemberRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  title: string | null;
  lastActiveAt: number | null;
}

const MEMBER_PAGE = 20;

function MembersSheet({ group, onClose }: { group: GroupRow; onClose: () => void }) {
  const [search, setSearch] = React.useState("");
  const debounced = useDebounce(search, 250);
  const [page, setPage] = React.useState(1);
  const [picked, setPicked] = React.useState<OptionItem[]>([]);

  // New search text resets pagination — render-phase adjust, no effect.
  const [prevQ, setPrevQ] = React.useState(debounced);
  if (debounced !== prevQ) { setPrevQ(debounced); setPage(1); }

  const membersQ = useQuery({
    queryKey: ["group-members", group.id, debounced, page],
    queryFn: () =>
      api<ListResponse<MemberRow>>(
        `/api/admin/groups/${group.id}/members?page=${page}&pageSize=${MEMBER_PAGE}&q=${encodeURIComponent(debounced)}`,
      ),
    placeholderData: (prev) => prev,
  });
  const members = membersQ.data?.data ?? [];
  const total = membersQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / MEMBER_PAGE));

  const add = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/groups/${group.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userIds: picked.map((p) => p.id) }),
      }),
    invalidate: [["group-members", group.id], ["/api/admin/groups"]],
    successToast: (d) => `${(d as { added: number }).added} member(s) added`,
    onSuccess: () => setPicked([]),
  });
  const remove = useApiMutation({
    mutationFn: (userId: number) =>
      api(`/api/admin/groups/${group.id}/members/${userId}`, { method: "DELETE" }),
    invalidate: [["group-members", group.id], ["/api/admin/groups"]],
    successToast: "Member removed",
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{group.name}</SheetTitle>
          <SheetDescription>{total.toLocaleString()} member(s)</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          <Label>Add learners</Label>
          <AsyncCombobox resource="learners" mode="multi" value={picked} onChange={(v) => setPicked(v as OptionItem[])} placeholder="Search learners…" />
          <Button size="sm" className="self-start" disabled={picked.length === 0 || add.isPending} onClick={() => add.mutate()}>
            Add {picked.length > 0 ? picked.length : ""} to cohort
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4">
          <div className="relative">
            <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            {membersQ.isPending ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" /> Loading…
              </div>
            ) : members.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No members</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-(length:--fs-meta) text-muted-foreground">{m.email}</p>
                  </div>
                  <StatusBadge value={m.status} />
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(m.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
