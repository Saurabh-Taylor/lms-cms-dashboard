"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { EnrollmentRow } from "@/lib/types";
import { useServerTable } from "@/hooks/use-server-table";
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
  const st = useServerTable<EnrollmentRow>(
    "/api/admin/enrollments",
    ["status", "courseId", "userId", "cohortId"],
    {
      ...(fixedCourseId ? { courseId: fixedCourseId } : {}),
      ...(fixedUserId ? { userId: fixedUserId } : {}),
    }
  );

  const bulk = useApiMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: string }) =>
      api("/api/admin/enrollments", { method: "PATCH", body: JSON.stringify({ ids, action }) }),
    invalidate: [qk.enrollments],
    successToast: (_, v) => `Updated ${v.ids.length} enrollment(s)`,
    onSuccess: st.clearSelection,
  });
  // Destructure the stable mutate fn — whole-mutation objects are recreated
  // each render, which would make the columns useMemo useless.
  const { mutate: bulkMutate } = bulk;

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
                ? { label: "Reactivate", onClick: () => bulkMutate({ ids: [row.original.id], action: "reactivate" }), separatorAbove: true }
                : { label: "Suspend", destructive: true, onClick: () => bulkMutate({ ids: [row.original.id], action: "suspend" }), separatorAbove: true },
            ]}
          />
        ),
      }
    );
    return cols;
  }, [hideLearnerCol, hideCourseCol, router, bulkMutate]);

  return (
    <DataTable
      columns={columns}
      {...st.tableProps}
      selectable
      rowSelection={st.selection}
      onRowSelectionChange={st.setSelection}
      getRowId={(r) => String(r.id)}
      emptyTitle="No enrollments"
      emptyDescription="Enrollments will appear here once learners are assigned to courses."
      toolbar={
        <TableToolbar>
          <SearchInput value={st.q} onChange={(v) => st.setFilter({ q: v })} placeholder="Search learner or course…" className={compact ? "w-52" : "w-64"} />
          <FilterSelect value={st.params.status} onChange={(v) => st.setFilter({ status: v })} options={STATUS_OPTS} placeholder="Status" allLabel="All statuses" className="w-36" />
        </TableToolbar>
      }
      bulkBar={
        <>
          <Button size="sm" variant="outline" onClick={() => bulkMutate({ ids: st.selectedIds, action: "suspend" })}>Suspend</Button>
          <Button size="sm" variant="outline" onClick={() => bulkMutate({ ids: st.selectedIds, action: "reactivate" })}>Reactivate</Button>
          <Button size="sm" variant="destructive" onClick={() => bulkMutate({ ids: st.selectedIds, action: "delete" })}>Remove</Button>
        </>
      }
    />
  );
}
