"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MegaphoneIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AnnouncementRow } from "@/lib/types";
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
import { fmtDate, fmtRelative } from "@/lib/format";

export function AnnouncementsTable() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api(`/api/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<AnnouncementRow, unknown>[]>(() => [
    { id: "title", accessorKey: "title", header: "Announcement", cell: ({ row }) => (
      <div className="min-w-0 max-w-md">
        <span className="block truncate font-medium">{row.original.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{row.original.body}</span>
      </div>
    ) },
    { id: "audience", accessorKey: "audience", header: "Audience", cell: ({ getValue }) => <span className="text-sm capitalize">{getValue() as string}</span> },
    { id: "status", accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: "scheduledAt", accessorKey: "scheduledAt", header: "Scheduled", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue() ? fmtDate(getValue() as number) : "—"}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
    { id: "_actions", enableHiding: false, meta: { className: "w-8" }, cell: ({ row }) => {
      const a = row.original;
      return <RowActions items={[
        a.status !== "sent" ? { label: "Send now", onClick: () => patch.mutate({ id: a.id, body: { status: "sent" } }) } : { label: "—", disabled: true },
        { label: "Delete", destructive: true, separatorAbove: true, onClick: () => del.mutate(a.id) },
      ]} />;
    } },
  ], [patch, del]);

  return (
    <ModuleTable<AnnouncementRow>
      endpoint="/api/admin/announcements"
      columns={columns}
      searchPlaceholder="Search announcements…"
      filters={[{ param: "status", placeholder: "Status", allLabel: "All statuses", options: [
        { value: "sent", label: "Sent" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" },
      ], className: "w-36" }]}
      emptyTitle="No announcements"
      emptyDescription="Broadcast updates to learners and instructors."
    />
  );
}

export function AnnouncementActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><MegaphoneIcon className="group-hover/button:translate-x-0.5" /> New announcement</Button>
      <CreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = React.useState({ title: "", body: "", audience: "all", status: "draft" });
  const create = useMutation({
    mutationFn: () => api("/api/admin/announcements", { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.success(f.status === "sent" ? "Announcement sent" : "Draft saved");
      qc.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      onOpenChange(false);
      setF({ title: "", body: "", audience: "all", status: "draft" });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Message</Label><Textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Audience</Label>
              <Select value={f.audience} onValueChange={(v) => setF({ ...f, audience: String(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="learners">Learners</SelectItem>
                  <SelectItem value="instructors">Instructors</SelectItem>
                  <SelectItem value="admins">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Delivery</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: String(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Save as draft</SelectItem>
                  <SelectItem value="sent">Send now</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!f.title || !f.body || create.isPending}>
              {create.isPending ? "Saving…" : f.status === "sent" ? "Send" : "Save draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
