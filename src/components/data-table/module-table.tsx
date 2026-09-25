"use client";

import * as React from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";

export interface FilterDef {
  param: string;
  placeholder: string;
  allLabel?: string;
  options: { value: string; label: string }[];
  className?: string;
}

interface ModuleTableProps<T> {
  endpoint: string;
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  filters?: FilterDef[];
  fixed?: Record<string, unknown>;
  selectable?: boolean;
  bulkActions?: (ids: number[], clear: () => void) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  extraParams?: Record<string, unknown>;
}

export function ModuleTable<T extends { id: number }>({
  endpoint, columns, searchPlaceholder, filters, fixed,
  selectable, bulkActions, onRowClick,
  emptyTitle, emptyDescription, emptyAction,
}: ModuleTableProps<T>) {
  const st = useServerTable<T>(
    endpoint,
    (filters ?? []).map((f) => f.param),
    fixed
  );
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  // Reset selection whenever URL params change (render-phase adjust)
  const [prevParams, setPrevParams] = React.useState(st.params);
  if (prevParams !== st.params) {
    setPrevParams(st.params);
    setSelection({});
  }

  const hasActiveFilters =
    !!st.q || (filters ?? []).some((f) => st.params[f.param]);
  const clearFilters = () =>
    st.setParams(
      Object.fromEntries([
        ["q", undefined], ["page", undefined],
        ...(filters ?? []).map((f) => [f.param, undefined] as const),
      ])
    );

  return (
    <DataTable
      columns={columns}
      {...st.tableProps}
      selectable={selectable}
      rowSelection={selection}
      onRowSelectionChange={setSelection}
      getRowId={(r) => String(r.id)}
      onRowClick={onRowClick}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      toolbar={
        (searchPlaceholder || filters?.length) ? (
          <TableToolbar>
            {searchPlaceholder && (
              <SearchInput value={st.q} onChange={(v) => st.setFilter({ q: v })} placeholder={searchPlaceholder} />
            )}
            {filters?.map((f) => (
              <FilterSelect
                key={f.param}
                value={st.params[f.param]}
                onChange={(v) => st.setFilter({ [f.param]: v })}
                options={f.options}
                placeholder={f.placeholder}
                allLabel={f.allLabel}
                className={f.className}
              />
            ))}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            )}
          </TableToolbar>
        ) : undefined
      }
      bulkBar={selectable && bulkActions
        ? bulkActions(Object.keys(selection).map(Number), () => setSelection({}))
        : undefined}
    />
  );
}
