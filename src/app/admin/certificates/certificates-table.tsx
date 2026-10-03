"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { CertificateRow, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDate } from "@/lib/format";

const baseCols: ColumnDef<CertificateRow, unknown>[] = [
  { id: "serial", accessorKey: "serial", header: "Serial", meta: { sortKey: "serial" }, cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.serial}</code>
      {row.original.revokedAt && (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">Revoked</span>
      )}
    </div>
  ) },
  { id: "userName", accessorKey: "userName", header: "Learner", meta: { sortKey: "userName" }, cell: ({ row }) => (
    <Link href={`/admin/learners/${row.original.userId}` as never} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
      {row.original.userName}
    </Link>
  ) },
  { id: "courseTitle", accessorKey: "courseTitle", header: "Course", meta: { sortKey: "courseTitle" }, cell: ({ row }) => (
    <Link href={`/admin/courses/${row.original.courseId}` as never} className="block max-w-64 truncate hover:underline" onClick={(e) => e.stopPropagation()}>
      {row.original.courseTitle}
    </Link>
  ) },
  { id: "issuedAt", accessorKey: "issuedAt", header: "Issued", meta: { sortKey: "issuedAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
];

export function CertificatesTable() {
  const [revokeTarget, setRevokeTarget] = React.useState<CertificateRow | null>(null);

  const restore = useApiMutation({
    mutationFn: (id: number) =>
      api(`/api/admin/certificates/${id}/restore`, { method: "POST" }),
    invalidate: [["/api/admin/certificates"]],
    successToast: "Certificate restored",
  });
  const revoke = useApiMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api(`/api/admin/certificates/${id}/revoke`, {
        method: "POST",
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    invalidate: [["/api/admin/certificates"]],
    successToast: "Certificate revoked",
    onSuccess: () => setRevokeTarget(null),
  });

  const cols = React.useMemo<ColumnDef<CertificateRow, unknown>[]>(() => [
    ...baseCols,
    {
      id: "_actions", enableHiding: false, meta: { className: "w-8" },
      cell: ({ row }) => (
        <RowActions
          items={[
            { label: "View certificate", onClick: () => window.open(`/verify/${encodeURIComponent(row.original.serial)}`, "_blank") },
            row.original.revokedAt
              ? { label: "Restore", onClick: () => restore.mutate(row.original.id), separatorAbove: true }
              : { label: "Revoke", destructive: true, onClick: () => setRevokeTarget(row.original), separatorAbove: true },
          ]}
        />
      ),
    },
  ], [restore]);

  return (
    <>
      <ModuleTable<CertificateRow>
        endpoint="/api/admin/certificates"
        columns={cols}
        searchPlaceholder="Search serial, learner, course…"
        emptyTitle="No certificates issued"
        emptyDescription="Certificates are issued when learners complete certificate-enabled courses."
      />
      <RevokeDialog
        cert={revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
        onConfirm={(id, reason) => revoke.mutate({ id, reason })}
        loading={revoke.isPending}
      />
    </>
  );
}

function RevokeDialog({
  cert, onOpenChange, onConfirm, loading,
}: {
  cert: CertificateRow | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: (id: number, reason?: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = React.useState("");
  // Snapshot the target at open (render-phase adjust) — `cert` can go null
  // mid-close while the confirm click is still in flight.
  const [target, setTarget] = React.useState<CertificateRow | null>(null);
  if (cert && cert !== target) setTarget(cert);
  return (
    <Dialog open={!!cert} onOpenChange={(v) => { if (!v) setReason(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Revoke certificate</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-xs">{target?.serial}</span> will show as revoked on its public verify page. This can be undone later.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revoke-reason">Reason (optional)</Label>
          <Input id="revoke-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued in error" />
        </div>
        <DialogFooter>
          <Button size="sm" variant="destructive" disabled={loading} onClick={() => target && onConfirm(target.id, reason.trim() || undefined)}>
            {loading ? "Working…" : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CertificateActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon /> Issue certificate</Button>
      <IssueDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function IssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [user, setUser] = React.useState<OptionItem | null>(null);
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const issue = useApiMutation({
    mutationFn: () =>
      api("/api/admin/certificates", {
        method: "POST",
        body: JSON.stringify({ userId: user!.id, courseId: course!.id }),
      }),
    invalidate: [["/api/admin/certificates"]],
    successToast: "Certificate issued",
    onSuccess: () => { onOpenChange(false); setUser(null); setCourse(null); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Issue certificate</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Learner</Label>
            <AsyncCombobox resource="learners" value={user} onChange={(v) => setUser(v as OptionItem | null)} placeholder="Search learners…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Course</Label>
            <AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as OptionItem | null)} placeholder="Search courses…" />
            <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">The learner must have completed the course.</p>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={() => issue.mutate()} disabled={!user || !course || issue.isPending}>
              {issue.isPending ? "Issuing…" : "Issue"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
