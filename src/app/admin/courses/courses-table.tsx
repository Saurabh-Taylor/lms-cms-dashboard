"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CourseRow, OptionItem } from "@/lib/types";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fmtRelative, initials } from "@/lib/format";
import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { api as apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

const STATUS_OPTS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];
const DIFF_OPTS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function CoursesTable({ openNew }: { openNew: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const st = useServerTable<CourseRow>("/api/admin/courses", [
    "status", "categoryId", "difficulty", "instructorId",
  ]);
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [formOpen, setFormOpen] = React.useState(openNew);
  const [deleting, setDeleting] = React.useState<CourseRow | null>(null);
  const [bulkDelete, setBulkDelete] = React.useState(false);

  const [prevParams, setPrevParams] = React.useState(st.params);
  if (prevParams !== st.params) {
    setPrevParams(st.params);
    setSelection({});
  }

  const categories = useQuery({
    queryKey: ["options", "categories"],
    queryFn: () => api<OptionItem[]>("/api/admin/options?resource=categories"),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/courses"] });

  const mut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiClient(`/api/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_, v) => {
      toast.success(v.body.status === "published" ? "Course published" : v.body.status === "archived" ? "Course archived" : "Course updated");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => apiClient(`/api/admin/courses/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => { toast.success("Course duplicated as draft"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiClient(`/api/admin/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Course deleted"); setDeleting(null); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const bulkDel = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) await apiClient(`/api/admin/courses/${id}`, { method: "DELETE" });
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} course(s) deleted`);
      setBulkDelete(false); setSelection({}); invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<CourseRow, unknown>[]>(
    () => [
      {
        id: "title", accessorKey: "title", header: "Course",
        meta: { sortKey: "title" },
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white"
              style={{ background: row.original.thumbnailColor }}
            >
              {initials(row.original.title)}
            </span>
            <div className="min-w-0">
              <Link
                href={`/admin/courses/${row.original.id}` as never}
                className="block truncate font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.original.title}
              </Link>
              <span className="block truncate text-(length:--fs-meta) leading-4 text-muted-foreground">
                {row.original.lessonCount} chapters · {row.original.difficulty}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "category", accessorKey: "categoryName", header: "Category",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span>,
      },
      {
        id: "instructor", accessorKey: "instructorName", header: "Instructor",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5 text-sm">
            {getValue() ? (
              <>
                <Avatar className="size-5"><AvatarFallback className="text-[8px]">{initials(getValue() as string)}</AvatarFallback></Avatar>
                <span className="truncate">{getValue() as string}</span>
              </>
            ) : "—"}
          </div>
        ),
      },
      {
        id: "enrollmentCount", accessorKey: "enrollmentCount", header: "Learners",
        meta: { sortKey: "enrollmentCount", className: "text-right", headerClassName: "text-right" },
        cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span>,
      },
      {
        id: "completionRate", accessorKey: "completionRate", header: "Completion",
        meta: { sortKey: "completionRate", className: "text-right", headerClassName: "text-right" },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}%</span>,
      },
      {
        id: "updatedAt", accessorKey: "updatedAt", header: "Updated",
        meta: { sortKey: "updatedAt" },
        cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{fmtRelative(getValue() as number)}</span>,
      },
      {
        id: "status", accessorKey: "status", header: "Status",
        meta: { sortKey: "status" },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "_actions", enableHiding: false,
        meta: { className: "w-8" },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <RowActions
              items={[
                { label: "View", onClick: () => router.push(`/admin/courses/${c.id}` as never) },
                { label: "Edit content", onClick: () => router.push(`/admin/courses/${c.id}/content` as never) },
                { label: "Duplicate", onClick: () => duplicate.mutate(c.id) },
                c.status !== "published"
                  ? { label: "Publish", onClick: () => mut.mutate({ id: c.id, body: { status: "published" } }) }
                  : { label: "Unpublish", onClick: () => mut.mutate({ id: c.id, body: { status: "draft" } }) },
                c.status !== "archived"
                  ? { label: "Archive", onClick: () => mut.mutate({ id: c.id, body: { status: "archived" } }) }
                  : { label: "Restore to draft", onClick: () => mut.mutate({ id: c.id, body: { status: "draft" } }) },
                { label: "Delete", destructive: true, separatorAbove: true, onClick: () => setDeleting(c) },
              ]}
            />
          );
        },
      },
    ],
    [router, mut, duplicate]
  );

  const selectedIds = Object.keys(selection).map((k) => Number(k));

  return (
    <>
      <DataTable
        columns={columns}
        {...st.tableProps}
        selectable
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        getRowId={(r) => String(r.id)}
        onRowClick={(r) => router.push(`/admin/courses/${r.id}` as never)}
        emptyTitle="No courses found"
        emptyDescription={st.q || Object.keys(st.filters).length ? "Try adjusting your search or filters." : "No courses have been created yet."}
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PlusIcon className="group-hover/button:translate-x-0.5" /> Create course
          </Button>
        }
        toolbar={
          <TableToolbar>
            <SearchInput value={st.q} onChange={(v) => st.setFilter({ q: v })} placeholder="Search courses…" />
            <FilterSelect value={st.params.status} onChange={(v) => st.setFilter({ status: v })} options={STATUS_OPTS} placeholder="Status" allLabel="All statuses" />
            <FilterSelect
              value={st.params.categoryId}
              onChange={(v) => st.setFilter({ categoryId: v })}
              options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.label }))}
              placeholder="Category" allLabel="All categories"
            />
            <FilterSelect value={st.params.difficulty} onChange={(v) => st.setFilter({ difficulty: v })} options={DIFF_OPTS} placeholder="Difficulty" allLabel="All levels" />
          </TableToolbar>
        }
        bulkBar={
          <>
            <Button size="sm" variant="outline" onClick={() => { for (const id of selectedIds) mut.mutate({ id, body: { status: "published" } }); }}>
              Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => { for (const id of selectedIds) mut.mutate({ id, body: { status: "archived" } }); setSelection({}); }}>
              Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDelete(true)}>
              Delete
            </Button>
          </>
        }
      />

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} onCreated={(id) => router.push(`/admin/courses/${id}` as never)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="This permanently removes the course, its sections, chapters and enrollments. This cannot be undone."
        confirmLabel="Delete course"
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
      <ConfirmDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        title={`Delete ${selectedIds.length} course(s)?`}
        description="This permanently removes the selected courses and their content."
        confirmLabel="Delete all"
        destructive
        loading={bulkDel.isPending}
        onConfirm={() => bulkDel.mutate(selectedIds)}
      />
    </>
  );
}
