"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useList } from "@/hooks/use-list";
import { DataTable } from "@/components/data-table/data-table";

/**
 * Server-paginated table with local (non-URL) page state —
 * for embedded lists inside detail/profile pages.
 */
export function LocalListTable<T>({
  endpoint, params, columns, pageSize: initialSize = 10, emptyTitle, emptyDescription,
}: {
  endpoint: string;
  params?: Record<string, unknown>;
  columns: ColumnDef<T, unknown>[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialSize);
  const paramsKey = JSON.stringify(params ?? {});
  const [prevParamsKey, setPrevParamsKey] = React.useState(paramsKey);
  if (prevParamsKey !== paramsKey) {
    setPrevParamsKey(paramsKey);
    setPage(1);
  }
  const query = useList<T>(endpoint, { page, pageSize, ...params });

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={pageSize}
      onSort={() => {}}
      onPageChange={setPage}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error?.message ?? null}
      onRetry={() => query.refetch()}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}
