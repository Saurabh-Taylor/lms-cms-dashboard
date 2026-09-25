"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LabRow, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDuration, fmtRelative } from "@/lib/format";

const STATUS = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "archived", label: "Archived" },
];
const TYPES = [
  { value: "vm", label: "VM" },
  { value: "container", label: "Container" },
  { value: "jupyter", label: "Jupyter" },
  { value: "cloud-sandbox", label: "Cloud sandbox" },
];

export function LabsTable() {
  const router = useRouter();
  const qc = useQueryClient();
  const [assignLab, setAssignLab] = React.useState<LabRow | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/labs"] });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api(`/api/admin/labs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Lab updated"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<LabRow, unknown>[]>(() => [
    {
      id: "name", accessorKey: "name", header: "Lab",
      meta: { sortKey: "name" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{row.original.type} · {row.original.resourceTier}</span>
        </div>
      ),
    },
    { id: "categoryName", accessorKey: "categoryName", header: "Category", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
    { id: "durationMin", accessorKey: "durationMin", header: "Duration", meta: { sortKey: "durationMin" }, cell: ({ getValue }) => <span className="tabular-nums text-sm">{fmtDuration(getValue() as number)}</span> },
    { id: "assignedCount", accessorKey: "assignedCount", header: "Assigned", meta: { sortKey: "assignedCount", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span> },
    { id: "status", accessorKey: "status", header: "Status", meta: { sortKey: "status" }, cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
    {
      id: "_actions", enableHiding: false, meta: { className: "w-8" },
      cell: ({ row }) => {
        const l = row.original;
        return (
          <RowActions items={[
            { label: "View", onClick: () => router.push(`/admin/labs/${l.id}` as never) },
            { label: "Assign learners…", onClick: () => setAssignLab(l), disabled: l.status !== "active" },
            l.status === "active"
              ? { label: "Disable", onClick: () => patch.mutate({ id: l.id, body: { status: "disabled" } }), separatorAbove: true }
              : { label: "Activate", onClick: () => patch.mutate({ id: l.id, body: { status: "active" } }), separatorAbove: true },
            { label: "Archive", onClick: () => patch.mutate({ id: l.id, body: { status: "archived" } }) },
          ]} />
        );
      },
    },
  ], [router, patch]);

  return (
    <>
      <ModuleTable<LabRow>
        endpoint="/api/admin/labs"
        columns={columns}
        searchPlaceholder="Search labs…"
        filters={[
          { param: "status", placeholder: "Status", allLabel: "All statuses", options: STATUS, className: "w-36" },
          { param: "type", placeholder: "Type", allLabel: "All types", options: TYPES, className: "w-40" },
        ]}
        onRowClick={(r) => router.push(`/admin/labs/${r.id}` as never)}
        emptyTitle="No labs"
        emptyDescription="Labs give learners hands-on practice environments."
      />
      <AssignLabDialog lab={assignLab} onClose={() => setAssignLab(null)} />
    </>
  );
}

export function LabsActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon /> New lab</Button>
      <CreateLabDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreateLabDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = React.useState({ name: "", type: "container", durationMin: 60, resourceTier: "small", description: "" });
  const create = useMutation({
    mutationFn: () => api("/api/admin/labs", { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.success("Lab created");
      qc.invalidateQueries({ queryKey: ["/api/admin/labs"] });
      onOpenChange(false);
      setF({ name: "", type: "container", durationMin: 60, resourceTier: "small", description: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New lab</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: String(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={5} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Size</Label>
              <Select value={f.resourceTier} onValueChange={(v) => setF({ ...f, resourceTier: String(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!f.name || create.isPending}>{create.isPending ? "Creating…" : "Create lab"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignLabDialog({ lab, onClose }: { lab: LabRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [learners, setLearners] = React.useState<OptionItem[]>([]);
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const assign = useMutation({
    mutationFn: () =>
      api<{ succeeded: number; failed: number }>(`/api/admin/labs/${lab!.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ userIds: learners.map((l) => l.id), courseId: course?.id }),
      }),
    onSuccess: (r) => {
      if (r.failed) toast.warning(`${r.succeeded} assigned, ${r.failed} skipped`);
      else toast.success(`Lab assigned to ${r.succeeded} learner(s)`);
      qc.invalidateQueries();
      onClose(); setLearners([]); setCourse(null);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={!!lab} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign “{lab?.name}”</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Learners</Label>
            <AsyncCombobox resource="learners" mode="multi" value={learners} onChange={(v) => setLearners(v as OptionItem[])} placeholder="Search learners…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Linked course (optional)</Label>
            <AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as OptionItem | null)} placeholder="Search courses…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => assign.mutate()} disabled={!learners.length || assign.isPending}>
              {assign.isPending ? "Assigning…" : `Assign to ${learners.length || ""}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
