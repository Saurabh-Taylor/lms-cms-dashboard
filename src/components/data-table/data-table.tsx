"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowUpIcon, ChevronsUpDownIcon, Columns3Icon,
  ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon,
  AlertTriangleIcon, SearchSlashIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sortKey?: string;
    className?: string;
    headerClassName?: string;
  }
}

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  onSort: (key: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectable?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (s: RowSelectionState) => void;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  bulkBar?: React.ReactNode;
}

export function DataTable<T>({
  columns, data, total, page, pageSize,
  sort, order, onSort, onPageChange, onPageSizeChange,
  isLoading, isFetching, error, onRetry,
  selectable, rowSelection, onRowSelectionChange,
  getRowId, onRowClick,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  toolbar, bulkBar,
}: DataTableProps<T>) {
  const [columnVisibility, setColumnVisibility] = React.useState({});

  const allColumns = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: "_select",
        enableHiding: false,
        meta: { className: "w-8", headerClassName: "w-8" },
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
      } as ColumnDef<T, unknown>,
      ...columns,
    ];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(total / pageSize),
    state: { columnVisibility, rowSelection: rowSelection ?? {} },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
      onRowSelectionChange?.(next);
    },
    enableRowSelection: selectable,
    getRowId,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const selectedCount = Object.values(rowSelection ?? {}).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {(toolbar || selectedCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && bulkBar ? (
            <div className="flex flex-1 items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-(--duration-normal)">
              <span className="text-sm text-muted-foreground tabular-nums">
                {selectedCount} selected
              </span>
              {bulkBar}
              <Button variant="ghost" size="sm" onClick={() => onRowSelectionChange?.({})}>
                Clear
              </Button>
            </div>
          ) : (
            <>
              {toolbar}
              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                    <Columns3Icon /> Columns
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                      {table.getAllLeafColumns()
                        .filter((c) => c.getCanHide() && c.id !== "_select")
                        .map((c) => (
                          <DropdownMenuCheckboxItem
                            key={c.id}
                            checked={c.getIsVisible()}
                            onCheckedChange={(v) => c.toggleVisibility(!!v)}
                          >
                            {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      )}

      <div className={cn("rounded-lg border bg-card transition-opacity", isFetching && !isLoading && "opacity-70")}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const sortKey = meta?.sortKey;
                  const sorted = sort === sortKey ? order : undefined;
                  return (
                    <TableHead key={h.id} className={meta?.headerClassName}>
                      {h.isPlaceholder ? null : sortKey ? (
                        <button
                          className="group inline-flex items-center gap-1 font-medium text-inherit hover:text-foreground"
                          onClick={() => onSort(sortKey)}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted ? (
                            <ArrowUpIcon
                              className={cn(
                                "size-3 transition-transform duration-(--duration-fast)",
                                sorted === "desc" && "rotate-180"
                              )}
                            />
                          ) : (
                            <ChevronsUpDownIcon className="size-3 opacity-40 transition-opacity duration-(--duration-fast) group-hover:opacity-70" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <TableRow key={i}>
                  {table.getVisibleLeafColumns().map((c) => (
                    <TableCell key={c.id}>
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <AlertTriangleIcon className="size-6 text-destructive" />
                    <p className="text-sm font-medium">Failed to load</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-2 text-center animate-in fade-in duration-(--duration-normal)">
                    <SearchSlashIcon className="size-5 text-muted-foreground/60" />
                    <p className="text-sm font-medium">{emptyTitle}</p>
                    {emptyDescription && (
                      <p className="max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
                    )}
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("h-10 py-0", cell.column.columnDef.meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-(length:--fs-meta) leading-4 text-muted-foreground tabular-nums">
          {total === 0 ? "0 results" : `${start}–${end} of ${total.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-(length:--fs-meta) leading-4 text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
              <ChevronsLeftIcon />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
              <ChevronLeftIcon />
            </Button>
            <span className="px-2 text-sm tabular-nums">
              {page} / {pageCount}
            </span>
            <Button variant="outline" size="icon-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)} aria-label="Last page">
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
