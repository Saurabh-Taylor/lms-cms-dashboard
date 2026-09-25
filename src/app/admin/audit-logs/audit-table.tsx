"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AuditRow } from "@/lib/types";
import { useTableParams } from "@/hooks/use-table-params";
import { useList } from "@/hooks/use-list";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { fmtDateTime } from "@/lib/format";

const MODULE_OPTS = [
  "courses", "learners", "enrollments", "assessments",
  "certificates", "announcements", "settings", "users", "categories",
  "groups", "learning-paths", "email-templates", "reports",
].map((m) => ({ value: m, label: m.replace(/-/g, " ") }));
const RANGE_OPTS = [
  { value: "1", label: "Last 24h" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AuditTable() {
  const tp = useTableParams();
  const [detail, setDetail] = React.useState<AuditRow | null>(null);

  const query = useList<AuditRow>("/api/admin/audit-logs", {
    page: tp.page, pageSize: tp.pageSize,
    q: tp.q || undefined, sort: tp.sort, order: tp.sort ? tp.order : undefined,
    module: tp.params.module,
    targetType: tp.params.targetType,
    range: tp.params.range,
  });

  const columns = React.useMemo<ColumnDef<AuditRow, unknown>[]>(() => [
    {
      id: "summary", accessorKey: "actorName", header: "Event",
      cell: ({ row }) => (
        <span className="text-sm">
          <span className="font-medium">{row.original.actorName}</span>{" "}
          <span className="text-muted-foreground">{row.original.action}</span>{" "}
          <span className="font-medium">{row.original.targetLabel}</span>
        </span>
      ),
    },
    { id: "module", accessorKey: "module", header: "Module", meta: { sortKey: "module" }, cell: ({ getValue }) => <Badge variant="secondary" className="capitalize">{(getValue() as string).replace(/-/g, " ")}</Badge> },
    { id: "targetType", accessorKey: "targetType", header: "Target", cell: ({ getValue }) => <span className="text-sm capitalize text-muted-foreground">{getValue() as string}</span> },
    { id: "createdAt", accessorKey: "createdAt", header: "Timestamp", meta: { sortKey: "createdAt" }, cell: ({ getValue }) => <span className="text-sm tabular-nums text-muted-foreground">{fmtDateTime(getValue() as number)}</span> },
  ], []);

  return (
    <>
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
        onRowClick={setDetail}
        emptyTitle="No audit events"
        emptyDescription="Admin actions are recorded here as they happen."
        toolbar={
          <TableToolbar>
            <SearchInput value={tp.q} onChange={(v) => tp.setFilter({ q: v })} placeholder="Search actor, action, target…" className="w-64" />
            <FilterSelect value={tp.params.module} onChange={(v) => tp.setFilter({ module: v })} options={MODULE_OPTS} placeholder="Module" allLabel="All modules" className="w-40" />
            <FilterSelect value={tp.params.range} onChange={(v) => tp.setFilter({ range: v })} options={RANGE_OPTS} placeholder="Range" allLabel="All time" className="w-36" />
          </TableToolbar>
        }
      />

      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Audit event #{detail?.id}</SheetTitle>
            <SheetDescription>
              {detail?.actorName} · {detail && fmtDateTime(detail.createdAt)}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 flex flex-col gap-4 px-4 text-sm">
              <p>
                <span className="font-medium">{detail.actorName}</span>{" "}
                {detail.action}{" "}
                <span className="font-medium">{detail.targetLabel}</span>
              </p>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-(length:--fs-meta) leading-4 text-muted-foreground">Module</dt><dd className="capitalize">{detail.module}</dd></div>
                <div><dt className="text-(length:--fs-meta) leading-4 text-muted-foreground">Target type</dt><dd className="capitalize">{detail.targetType}</dd></div>
                <div><dt className="text-(length:--fs-meta) leading-4 text-muted-foreground">Target ID</dt><dd>{detail.targetId ?? "—"}</dd></div>
                <div><dt className="text-(length:--fs-meta) leading-4 text-muted-foreground">IP</dt><dd className="font-mono text-xs">{detail.ip ?? "—"}</dd></div>
              </dl>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Technical details</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(safeParse(detail.details), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}
