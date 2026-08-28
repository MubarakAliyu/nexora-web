"use client";

import * as React from "react";
import { Upload, CheckCircle, ExclamationCircle } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { previewImport, applyImport, CSV_HEADERS, type ImportPreviewRow } from "@/lib/api/catalogue";

const KIND_STYLE: Record<ImportPreviewRow["kind"], string> = {
  added: "border-primary/30 bg-primary/10 text-primary",
  updated: "border-primary/30 bg-primary/10 text-primary",
  unchanged: "border-transparent bg-surface-hover text-muted",
  error: "border-accent bg-surface-active text-foreground",
};

const fmt = (n: number, c: string) => `${c} ${Math.round(n).toLocaleString("en-UG")}`;

/**
 * Catalogue CSV import. This is how the stakeholder's price list gets in quickly
 * once it arrives — but nothing is written until the admin has seen a line-by-line
 * diff. Unknown service types/categories and malformed prices are reported with
 * their row number rather than silently skipped.
 */
export function ImportCatalogueDialog({ open, onOpenChange, onDone }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [rows, setRows] = React.useState<ImportPreviewRow[] | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) { setRows(null); setFileName(""); }
  }, [open]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const preview = previewImport(text);
      setRows(preview);
      if (preview.length === 0) toast.error("Nothing to import", { description: "The file had no data rows." });
    } catch {
      toast.error("Couldn’t read that file");
    }
  };

  const counts = React.useMemo(() => {
    const c = { added: 0, updated: 0, unchanged: 0, error: 0 };
    (rows ?? []).forEach((r) => { c[r.kind]++; });
    return c;
  }, [rows]);

  const applicable = (rows ?? []).filter((r) => r.kind === "added" || r.kind === "updated");

  const apply = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const res = await applyImport(rows);
      toast.success("Catalogue imported", { description: `${res.added} added, ${res.updated} updated.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t apply the import"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import catalogue</DialogTitle>
          <DialogDescription>
            CSV columns: {CSV_HEADERS.join(" · ")}. Export first to get the exact shape.
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Upload size={28} className="mx-auto text-muted" />
            <p className="mt-3 text-body text-muted">Choose a catalogue CSV to preview the changes.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button className="mt-4" onClick={() => inputRef.current?.click()}>Choose file</Button>
          </div>
        ) : (
          <div className="motion-safe:animate-in motion-safe:fade-in">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-foreground">{fileName}</span>
              <Badge className="border-transparent bg-primary/10 text-primary">{counts.added} added</Badge>
              <Badge className="border-transparent bg-primary/10 text-primary">{counts.updated} updated</Badge>
              <Badge className="border-transparent bg-surface-hover text-muted">{counts.unchanged} unchanged</Badge>
              {counts.error > 0 && <Badge className="border-accent bg-surface-active text-foreground">{counts.error} errors</Badge>}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-body">
                <thead className="sticky top-0 bg-surface-hover">
                  <tr>
                    <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Row</th>
                    <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Item</th>
                    <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Change</th>
                    <th className="px-3 py-2 text-right text-caption font-semibold uppercase tracking-wide text-muted">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className="border-t border-border">
                      <td className="px-3 py-2 text-caption text-muted">{r.line}</td>
                      <td className="px-3 py-2">
                        <span className="text-foreground">{r.item || "—"}</span>
                        <span className="block text-caption text-muted">{r.serviceType} · {r.category}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={cn("capitalize", KIND_STYLE[r.kind])}>{r.kind}</Badge>
                        {r.message && <span className="mt-0.5 block text-caption text-muted">{r.message}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.kind === "error" ? <span className="text-muted">—</span> : (
                          <span className="text-foreground">
                            {r.oldPrice !== undefined && r.oldPrice !== r.price && (
                              <span className="text-muted line-through">{fmt(r.oldPrice, r.currency)}{" "}</span>
                            )}
                            {fmt(r.price, r.currency)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-caption text-muted">
              {counts.error > 0
                ? <><ExclamationCircle size={14} className="text-primary" /> Rows with errors are skipped; everything else will be applied.</>
                : <><CheckCircle size={14} className="text-primary" /> All rows parsed successfully.</>}
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={apply} loading={busy} disabled={!rows || applicable.length === 0}>
            Apply {applicable.length} change{applicable.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
