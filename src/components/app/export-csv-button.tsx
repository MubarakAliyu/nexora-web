"use client";

import { Download } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { generateCSV, type CsvColumn } from "@/lib/csv";

/** Reusable "Export CSV" button — feeds rows + columns to generateCSV. */
export function ExportCsvButton<T>({
  data, columns, filename, label = "Export CSV", disabled,
}: {
  data: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      className="gap-2"
      disabled={disabled || data.length === 0}
      onClick={() => generateCSV(data, columns, filename)}
    >
      <Download size={18} /> {label}
    </Button>
  );
}
