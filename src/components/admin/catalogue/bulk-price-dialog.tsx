"use client";

import * as React from "react";
import { formatCurrencyFull } from "@/lib/format";
import type { Currency } from "@/lib/mock/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { previewBulkPrice, applyBulkPrice, type BulkMode, type BulkPriceChange } from "@/lib/api/catalogue";

const fmt = (n: number, c: string) => formatCurrencyFull(n, c as Currency);

/**
 * Bulk reprice. Nothing is written until the admin has seen exactly which items
 * change and by how much — repricing twenty rows blind is how a price list ends
 * up quietly wrong.
 */
export function BulkPriceDialog({ open, itemIds, onOpenChange, onDone }: {
  open: boolean;
  itemIds: string[];
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [mode, setMode] = React.useState<BulkMode>("percent");
  const [value, setValue] = React.useState<number>(10);
  const [preview, setPreview] = React.useState<BulkPriceChange[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) { setMode("percent"); setValue(10); setPreview(null); }
  }, [open]);

  const doPreview = () => setPreview(previewBulkPrice(itemIds, mode, Number(value) || 0));

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const n = await applyBulkPrice(preview);
      toast.success(`Prices updated`, { description: `${n} item${n === 1 ? "" : "s"} repriced.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t apply the price change"); }
    finally { setBusy(false); }
  };

  const changing = preview?.filter((c) => c.oldPrice !== c.newPrice) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk price update</DialogTitle>
          <DialogDescription>{itemIds.length} item{itemIds.length === 1 ? "" : "s"} selected</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Change type" htmlFor="bp-mode">
            <select id="bp-mode" className={selectClass} value={mode}
              onChange={(e) => { setMode(e.target.value as BulkMode); setPreview(null); }}>
              <option value="percent">Percentage change</option>
              <option value="flat">Set flat price</option>
            </select>
          </Field>
          <Field label={mode === "percent" ? "Percentage (use −10 to reduce)" : "New price"} htmlFor="bp-val">
            <Input id="bp-val" type="number" value={value}
              onChange={(e) => { setValue(Number(e.target.value)); setPreview(null); }} />
          </Field>
        </div>

        {!preview ? (
          <Button variant="outline" onClick={doPreview} className="w-full">Preview changes</Button>
        ) : (
          <div className="motion-safe:animate-in motion-safe:fade-in">
            <p className="mb-2 text-body font-medium text-foreground">
              {changing.length} of {preview.length} item{preview.length === 1 ? "" : "s"} will change
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-body">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Item</th>
                    <th className="px-3 py-2 text-right text-caption font-semibold uppercase tracking-wide text-muted">From</th>
                    <th className="px-3 py-2 text-right text-caption font-semibold uppercase tracking-wide text-muted">To</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c) => (
                    <tr key={c.itemId} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{c.name}</td>
                      <td className="px-3 py-2 text-right text-muted">{fmt(c.oldPrice, c.currency)}</td>
                      <td className="px-3 py-2 text-right font-medium text-primary">{fmt(c.newPrice, c.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={apply} loading={busy} disabled={!preview || changing.length === 0}>
            Apply to {changing.length} item{changing.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
