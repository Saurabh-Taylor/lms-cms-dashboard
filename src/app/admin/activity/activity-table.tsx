"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActivityRow, OptionItem } from "@/lib/types";
import { useTableParams } from "@/hooks/use-table-params";
import { useList } from "@/hooks/use-list";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtDateTime } from "@/lib/format";

const TYPE_OPTS = [
  { value: "logged_in", label: "Logged in" },
  { value: "course_opened", label: "Course opened" },
  { value: "chapter_completed", label: "Chapter completed" },
  { value: "lab_started", label: "Lab started" },
  { value: "lab_completed", label: "Lab completed" },
  { value: "assignment_submitted", label: "Assignment submitted" },
  { value: "quiz_completed", label: "Quiz completed" },
  { value: "resource_downloaded", label: "Resource downloaded" },
];
const RANGE_OPTS = [
  { value: "1", label: "Last 24h" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function ActivityTable() {
  const tp = useTableParams();
  const [learner, setLearner] = React.useState<OptionItem | null>(null);

  const query = useList<ActivityRow>("/api/admin/activity", {
    page: tp.page, pageSize: tp.pageSize,
    q: tp.q || undefined, sort: tp.sort, order: tp.sort ? tp.order : undefined,
    userId: learner?.id,
    type: tp.params.type,
    courseId: tp.params.courseId,
    range: tp.params.range,
  });

  const columns = React.useMemo<ColumnDef<ActivityRow, unknown>[]>(() => [
    { id: "userName", accessorKey: "userName", header: "Learner", meta: { sortKey: "userName" }, cell: ({ row }) => (
      <Link href={`/admin/learners/${row.original.userId}` as never} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
        {row.original.userName}
      </Link>
    ) },
    { id: "type", accessorKey: "type", header: "Event", meta: { sortKey: "type" }, cell: ({ getValue }) => (
      <span className="font-medium capitalize">{(getValue() as string).replace(/_/g, " ")}</span>
    ) },
    { id: "courseTitle", accessorKey: "courseTitle", header: "Course", cell: ({ row }) => (
      row.original.courseTitle
        ? <Link href={`/admin/courses/${row.original.courseId}` as never} className="block max-w-56 truncate text-sm hover:underline" onClick={(e) => e.stopPropagation()}>{row.original.courseTitle}</Link>
        : <span className="text-sm text-muted-foreground">—</span>
    ) },
    { id: "meta", accessorKey: "meta", header: "Device", cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{safeMeta(getValue() as string)}</span>
    ) },
    { id: "createdAt", accessorKey: "createdAt", header: "When", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{fmtDateTime(getValue() as number)}</span>
    ) },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={tp.page} pageSize={tp.pageSize}
      sort={tp.sort} order={tp.order}
      onSort={tp.toggleSort}
      onPageChange={(p) => tp.setParams({ page: p })}
      onPageSizeChange={(s) => tp.setParams({ pageSize: s, page: undefined })}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error?.message ?? null}
      onRetry={() => query.refetch()}
      emptyTitle="No activity"
      emptyDescription={learner ? `No events for ${learner.label} with these filters.` : "No events match the current filters."}
      toolbar={
        <TableToolbar>
          <div className="w-56">
            <AsyncCombobox
              resource="learners" value={learner}
              onChange={(v) => { setLearner(v as OptionItem | null); tp.setParams({ page: undefined }); }}
              placeholder="Filter by learner…"
            />
          </div>
          <SearchInput value={tp.q} onChange={(v) => tp.setFilter({ q: v })} placeholder="Search learner name…" className="w-52" />
          <FilterSelect value={tp.params.type} onChange={(v) => tp.setFilter({ type: v })} options={TYPE_OPTS} placeholder="Event type" allLabel="All events" className="w-44" />
          <FilterSelect value={tp.params.range} onChange={(v) => tp.setFilter({ range: v })} options={RANGE_OPTS} placeholder="Range" allLabel="All time" className="w-36" />
        </TableToolbar>
      }
    />
  );
}

function safeMeta(meta: string) {
  try { return JSON.parse(meta).device ?? "—"; } catch { return "—"; }
}
