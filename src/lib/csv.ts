/**
 * Minimal CSV generator + browser download. Takes typed rows + column defs and
 * triggers a real .csv file download. Used by every "Export CSV" button.
 */
import { toast } from "@/components/ui/sonner";

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  // Quote if the cell contains a comma, quote or newline; double embedded quotes.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = data.map((row) => columns.map((c) => escapeCell(c.accessor(row))).join(",")).join("\n");
  return `${head}\n${body}`;
}

/** Build a CSV from data + columns and trigger a download as `<filename>.csv`. */
export function generateCSV<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  const label = filename.replace(/\.csv$/i, "");
  toast.loading?.(`Exporting ${label}…`);
  const csv = toCsv(data, columns);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Downloaded ${label}.csv`);
}
