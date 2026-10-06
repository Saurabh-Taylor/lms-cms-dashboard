"use client";

import * as React from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { useList } from "@/hooks/use-list";
import { useTableParams } from "@/hooks/use-table-params";

/**
 * Wires URL params → server-paginated list endpoint → DataTable props.
 * filterKeys declares which URL params are forwarded as filters.
 * Also owns row selection: it resets whenever the URL params change.
 */
export function useServerTable<T extends { id: number }>(
  endpoint: string,
  filterKeys: string[] = [],
  fixed: Record<string, unknown> = {}
) {
  const tp = useTableParams();

  const [selection, setSelection] = React.useState<RowSelectionState>({});
  // Reset selection whenever URL params change (render-phase adjust)
  const [prevParams, setPrevParams] = React.useState(tp.params);
  if (prevParams !== tp.params) {
    setPrevParams(tp.params);
    setSelection({});
  }
  const selectedIds = React.useMemo(() => Object.keys(selection).map(Number), [selection]);
  const clearSelection = React.useCallback(() => setSelection({}), []);

  const filters = Object.fromEntries(
    filterKeys.map((k) => [k, tp.params[k]]).filter(([, v]) => v !== undefined)
  );

  const query = useList<T>(endpoint, {
    page: tp.page,
    pageSize: tp.pageSize,
    q: tp.q || undefined,
    sort: tp.sort,
    order: tp.sort ? tp.order : undefined,
    ...filters,
    ...fixed,
  });

  const tableProps = {
    data: (query.data?.data ?? []) as T[],
    total: query.data?.total ?? 0,
    page: tp.page,
    pageSize: tp.pageSize,
    sort: tp.sort,
    order: tp.order,
    onSort: tp.toggleSort,
    onPageChange: (p: number) => tp.setParams({ page: p }),
    onPageSizeChange: (s: number) => tp.setParams({ pageSize: s, page: undefined }),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message ?? null,
    onRetry: () => query.refetch(),
  };

  return { ...tp, query, tableProps, filters, selection, setSelection, selectedIds, clearSelection };
}
