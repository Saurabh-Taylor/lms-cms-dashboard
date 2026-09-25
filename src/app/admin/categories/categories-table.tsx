"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CategoryRow } from "@/lib/types";
import { ModuleTable } from "@/components/data-table/module-table";
import { RowActions } from "@/components/data-table/row-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";

export function CategoriesTable() {
  const qc = useQueryClient();
  const [edit, setEdit] = React.useState<CategoryRow | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/categories"] });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Category deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<CategoryRow, unknown>[]>(() => [
    { id: "name", accessorKey: "name", header: "Name", meta: { sortKey: "name" }, cell: ({ row }) => (
      <div><span className="font-medium">{row.original.name}</span>
      <span className="ml-2 text-xs text-muted-foreground">{row.original.slug}</span></div>
    ) },
    { id: "courseCount", accessorKey: "courseCount", header: "Courses", meta: { sortKey: "courseCount", className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Created", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
    { id: "_actions", enableHiding: false, meta: { className: "w-8" }, cell: ({ row }) => (
      <RowActions items={[
        { label: "Edit", onClick: () => setEdit(row.original) },
        { label: "Delete", destructive: true, separatorAbove: true, onClick: () => del.mutate(row.original.id) },
      ]} />
    ) },
  ], [del]);

  return (
    <>
      <ModuleTable<CategoryRow>
        endpoint="/api/admin/categories"
        columns={columns}
        searchPlaceholder="Search categories…"
        emptyTitle="No categories"
        emptyDescription="Categories group courses for browsing and reporting."
      />
      <CategoryDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} edit={edit} />
    </>
  );
}

export function CategoryActions() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><PlusIcon className="group-hover/button:translate-x-0.5" /> New category</Button>
      <CategoryDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CategoryDialog({ open, onOpenChange, edit }: { open: boolean; onOpenChange: (v: boolean) => void; edit?: CategoryRow | null }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [prevKey, setPrevKey] = React.useState(`${open}-${edit?.id}`);
  const curKey = `${open}-${edit?.id}`;
  if (prevKey !== curKey) {
    setPrevKey(curKey);
    if (open) { setName(edit?.name ?? ""); setDescription(edit?.description ?? ""); }
  }

  const save = useMutation({
    mutationFn: () =>
      edit
        ? api(`/api/admin/categories/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name, description }) })
        : api("/api/admin/categories", { method: "POST", body: JSON.stringify({ name, description }) }),
    onSuccess: () => {
      toast.success(edit ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{edit ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
