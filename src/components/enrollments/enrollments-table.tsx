"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { EnrollmentRow } from "@/lib/types";
import { useTableParams } from "@/hooks/use-table-params";
import { useList } from "@/hooks/use-list";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";

const STATUS_OPTS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
];

export function EnrollmentsTable({
  fixedCourseId, fixedUserId, hideLearnerCol, hideCourseCol, compact,
}: {
  fixedCourseId?: number;
  fixedUserId?: number;
  hideLearnerCol?: boolean;
  hideCourseCol?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const tp = useTableParams();
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [prevParams, setPrevParams] = React.useState(tp.params);
  if (prevParams !== tp.params) {
    setPrevParams(tp.params);
    setSelection({});
  }

  const query = useList<EnrollmentRow>("/api/admin/enrollments", {
    page: tp.page,
    pageSize: tp.pageSize,
    q: tp.q || undefined,
    sort: tp.sort,
    order: tp.sort ? tp.order : undefined,
    status: tp.params.status,
    courseId: fixedCourseId ?? tp.params.courseId,
    userId: fixedUserId ?? tp.params.userId,
    cohortId: tp.params.cohortId,
  });

  const bulk = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: string }) =>
      api("/api/admin/enrollments", { method: "PATCH", body: JSON.stringify({ ids, action }) }),
    onSuccess: (_, v) => {
      toast.success(`Updated ${v.ids.length} enrollment(s)`);
      setSelection({});
      qc.invalidateQueries({ queryKey: ["/api/admin/enrollments"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = React.useMemo<ColumnDef<EnrollmentRow, unknown>[]>(() => {
    const cols: ColumnDef<EnrollmentRow, unknown>[] = [];
    if (!hideLearnerCol)
      cols.push({
        id: "userName", accessorKey: "userName", header: "Learner",
        meta: { sortKey: "userName" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link href={`/admin/learners/${row.original.userId}` as never} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {row.original.userName}
            </Link>
            <span className="block truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{row.original.userEmail}</span>
          </div>
        ),
      });
    if (!hideCourseCol)
      cols.push({
        id: "courseTitle", accessorKey: "courseTitle", header: "Course",
        meta: { sortKey: "courseTitle" },
        cell: ({ row }) => (
          <Link href={`/admin/courses/${row.original.courseId}` as never} className="block max-w-56 truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.courseTitle}
          </Link>
        ),
      });
    cols.push(
      {
        id: "status", accessorKey: "status", header: "Status",
        meta: { sortKey: "status" },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "progress", accessorKey: "progress", header: "Progress",
        meta: { sortKey: "progress", className: "w-36" },
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <Progress value={getValue() as number} className="h-1.5 w-16" />
            <span className="text-xs tabular-nums text-muted-foreground">{getValue() as number}%</span>
          </div>
        ),
      },
      {
        id: "enrolledAt", accessorKey: "enrolledAt", header: "Enrolled",
        meta: { sortKey: "enrolledAt" },
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span>,
      },
      {
        id: "expiresAt", accessorKey: "expiresAt", header: "Expires",
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue() ? fmtDate(getValue() as number) : "—"}</span>,
      },
      {
        id: "_actions", enableHiding: false, meta: { className: "w-8" },
        cell: ({ row }) => (
          <RowActions
            items={[
              { label: "View learner", onClick: () => router.push(`/admin/learners/${row.original.userId}` as never) },
              { label: "View course", onClick: () => router.push(`/admin/courses/${row.original.courseId}` as never) },
              row.original.status === "suspended"
                ? { label: "Reactivate", onClick: () => bulk.mutate({ ids: [row.original.id], action: "reactivate" }), separatorAbove: true }
                : { label: "Suspend", onClick: () => bulk.mutate({ ids: [row.original.id], action: "suspend" }), separatorAbove: true },
            ]}
          />
        ),
      }
    );
    return cols;
  }, [hideLearnerCol, hideCourseCol, router, bulk]);

  const selIds = Object.keys(selection).map(Number);

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={tp.page}
      pageSize={tp.pageSize}
      sort={tp.sort}
      order={tp.order}
      onSort={tp.toggleSort}
      onPageChange={(p) => tp.setParams({ page: p })}
      onPageSizeChange={(s) => tp.setParams({ pageSize: s, page: undefined })}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error?.message ?? null}
      onRetry={() => query.refetch()}
      selectable
      rowSelection={selection}
      onRowSelectionChange={setSelection}
      getRowId={(r) => String(r.id)}
      emptyTitle="No enrollments"
      emptyDescription="Enrollments will appear here once learners are assigned to courses."
      toolbar={
        <TableToolbar>
          <SearchInput value={tp.q} onChange={(v) => tp.setFilter({ q: v })} placeholder="Search learner or course…" className={compact ? "w-52" : "w-64"} />
          <FilterSelect value={tp.params.status} onChange={(v) => tp.setFilter({ status: v })} options={STATUS_OPTS} placeholder="Status" allLabel="All statuses" className="w-36" />
        </TableToolbar>
      }
      bulkBar={
        <>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate({ ids: selIds, action: "suspend" })}>Suspend</Button>
          <Button size="sm" variant="outline" onClick={() => bulk.mutate({ ids: selIds, action: "reactivate" })}>Reactivate</Button>
          <Button size="sm" variant="destructive" onClick={() => bulk.mutate({ ids: selIds, action: "delete" })}>Remove</Button>
        </>
      }
    />
  );
}
