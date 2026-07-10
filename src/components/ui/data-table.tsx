"use client";

import * as React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronSort,
} from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
import { Checkbox } from "./checkbox";
import { Pagination } from "./pagination";
import { SkeletonTable } from "./skeleton";
import { EmptyState } from "./empty-state";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  pageSize?: number;
  selectable?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Generic table with client-side sorting, pagination, row selection, and
 * loading / empty / error states. Feed it typed rows + a column config.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  pageSize = 8,
  selectable = false,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  emptyTitle = "No records",
  emptyDescription = "There is nothing to show here yet.",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const value = (row: T) =>
      col.sortValue
        ? col.sortValue(row)
        : ((row as Record<string, unknown>)[col.key] as string | number);
    return [...data].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  };

  const pageIds = rows.map(getRowId);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <SkeletonTable rows={pageSize} cols={columns.length} />;

  if (error) {
    return (
      <EmptyState
        title="Couldn’t load data"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const alignCls = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <TableHead key={col.key} className={alignCls(col.align)}>
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {col.header}
                        {active ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={14} className="text-primary" />
                          ) : (
                            <ChevronDown size={14} className="text-primary" />
                          )
                        ) : (
                          <ChevronSort size={14} className="opacity-60" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.has(id);
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {selectable && (
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(alignCls(col.align), col.className)}
                    >
                      {col.render
                        ? col.render(row)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? "",
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-caption text-muted">
          {selectable && selected.size > 0
            ? `${selected.size} selected · `
            : ""}
          {sorted.length} record{sorted.length === 1 ? "" : "s"}
        </p>
        <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
