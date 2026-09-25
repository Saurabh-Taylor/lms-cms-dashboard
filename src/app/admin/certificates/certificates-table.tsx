"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CertificateRow, OptionItem } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDate } from "@/lib/format";

const cols: ColumnDef<CertificateRow, unknown>[] = [
  { id: "serial", accessorKey: "serial", header: "Serial", meta: { sortKey: "serial" }, cell: ({ getValue }) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{getValue() as string}</code> },
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
  return (
    <ModuleTable<CertificateRow>
      endpoint="/api/admin/certificates"
      columns={cols}
      searchPlaceholder="Search serial, learner, course…"
      emptyTitle="No certificates issued"
      emptyDescription="Certificates are issued when learners complete certificate-enabled courses."
    />
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
  const qc = useQueryClient();
  const [user, setUser] = React.useState<OptionItem | null>(null);
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const issue = useMutation({
    mutationFn: () =>
      api("/api/admin/certificates", {
        method: "POST",
        body: JSON.stringify({ userId: user!.id, courseId: course!.id }),
      }),
    onSuccess: () => {
      toast.success("Certificate issued");
      qc.invalidateQueries({ queryKey: ["/api/admin/certificates"] });
      onOpenChange(false); setUser(null); setCourse(null);
    },
    onError: (e) => toast.error(e.message),
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
            <p className="text-xs text-muted-foreground">The learner must have completed the course.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => issue.mutate()} disabled={!user || !course || issue.isPending}>
              {issue.isPending ? "Issuing…" : "Issue"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
