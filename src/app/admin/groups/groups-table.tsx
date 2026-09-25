"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { GroupRow } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate } from "@/lib/format";

const cols: ColumnDef<GroupRow, unknown>[] = [
  { id: "name", accessorKey: "name", header: "Name", meta: { sortKey: "name" }, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "description", accessorKey: "description", header: "Description", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) ?? "—"}</span> },
  { id: "memberCount", accessorKey: "memberCount", header: "Members", meta: { sortKey: "memberCount", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span> },
  { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
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
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon /> New cohort</Button>
      <CreateGroup open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreateGroup({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const create = useMutation({
    mutationFn: () => api("/api/admin/groups", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      toast.success("Cohort created");
      qc.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      onOpenChange(false); setName("");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New cohort</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name || create.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
