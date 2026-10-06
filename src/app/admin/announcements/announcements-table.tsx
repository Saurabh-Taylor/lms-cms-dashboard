"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MegaphoneIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
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
import { qk } from "@/lib/query-keys";

export function AnnouncementsTable() {
  const patch = useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api(`/api/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    invalidate: [qk.announcements],
    successToast: "Updated",
  });
  const del = useApiMutation({
    mutationFn: (id: number) => api(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    invalidate: [qk.announcements],
    successToast: "Deleted",
  });

  const columns = React.useMemo<ColumnDef<AnnouncementRow, unknown>[]>(() => [
    { id: "title", accessorKey: "title", header: "Announcement", cell: ({ row }) => (
      <div className="min-w-0 max-w-md">
        <span className="block truncate font-medium">{row.original.title}</span>
        <span className="block truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{row.original.body}</span>
      </div>
    ) },
    { id: "audience", accessorKey: "audience", header: "Audience", cell: ({ getValue }) => <span className="text-sm capitalize">{getValue() as string}</span> },
    { id: "status", accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: "delivery", header: "Delivery", cell: ({ row }) => {
      const a = row.original;
      const label = a.status === "sent" && a.sentAt
        ? `Sent ${fmtRelative(a.sentAt)}`
        : a.status === "scheduled" && a.scheduledAt
          ? `For ${fmtDate(a.scheduledAt)}`
          : "—";
      return <span className="text-sm text-muted-foreground">{label}</span>;
    } },
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
  const [f, setF] = React.useState({ title: "", body: "", audience: "all", status: "draft", scheduledAt: "" });
  const create = useApiMutation({
    mutationFn: () =>
      api("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: f.title, body: f.body, audience: f.audience, status: f.status,
          // scheduled ↔ scheduledAt are a pair in the contract — only send together.
          ...(f.status === "scheduled" ? { scheduledAt: new Date(f.scheduledAt).getTime() } : {}),
        }),
      }),
    invalidate: [qk.announcements],
    successToast: () =>
      f.status === "sent" ? "Announcement sent" : f.status === "scheduled" ? "Announcement scheduled" : "Draft saved",
    onSuccess: () => {
      onOpenChange(false);
      setF({ title: "", body: "", audience: "all", status: "draft", scheduledAt: "" });
    },
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
                  <SelectItem value="scheduled">Schedule for later</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {f.status === "scheduled" && (
            <div className="flex flex-col gap-1.5">
              <Label>Deliver at</Label>
              <Input
                type="datetime-local"
                value={f.scheduledAt}
                onChange={(e) => setF({ ...f, scheduledAt: e.target.value })}
                required
              />
              <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
                Delivers within about a minute of the scheduled time.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              size="sm" type="submit"
              disabled={!f.title || !f.body || (f.status === "scheduled" && !f.scheduledAt) || create.isPending}
            >
              {create.isPending ? "Saving…" : f.status === "sent" ? "Send" : f.status === "scheduled" ? "Schedule" : "Save draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
