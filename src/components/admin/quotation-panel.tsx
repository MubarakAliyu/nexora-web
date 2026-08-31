"use client";

import * as React from "react";
import type { Currency } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrencyFull} from "@/lib/format";
import { quotationForBooking } from "@/lib/api/catalogue";

const fmt = (n: number, c: string) => formatCurrencyFull(n, c as Currency);

/**
 * The accepted quotation on a service booking, shown at the prices the customer
 * agreed to — read from the snapshot, never recomputed from the live catalogue.
 */
export function QuotationPanel({ bookingId }: { bookingId: string }) {
  const quote = quotationForBooking(bookingId);
  if (!quote) return null;

  const counted = quote.lines.filter((l) => !l.excludedFromTotal);
  const excluded = quote.lines.filter((l) => l.excludedFromTotal);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-medium uppercase tracking-wide text-muted">Accepted quotation</p>
        <span className="text-caption text-muted">{formatDate(quote.acceptedAt)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-caption">
          <thead>
            <tr className="text-muted">
              <th className="py-1 text-left font-medium">Item</th>
              <th className="py-1 text-center font-medium">Qty</th>
              <th className="py-1 text-right font-medium">Unit</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {counted.map((l) => (
              <tr key={l.itemId} className="border-t border-border">
                <td className="py-1.5 text-foreground">{l.name}<span className="block text-muted">{l.unit}</span></td>
                <td className="py-1.5 text-center text-foreground">{l.quantity}</td>
                <td className="py-1.5 text-right text-muted">{fmt(l.unitPriceAtBooking, quote.currency)}</td>
                <td className="py-1.5 text-right font-medium text-foreground">{fmt(l.lineTotal, quote.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-primary/30">
              <td colSpan={3} className="py-2 text-right font-medium text-foreground">Total</td>
              <td className="py-2 text-right font-heading text-body font-semibold text-primary">
                {fmt(quote.total, quote.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {excluded.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent/40 bg-surface-hover p-3">
          <p className="flex items-center gap-2 text-caption font-medium text-foreground">
            <Badge className="border-accent/40 bg-surface-active text-foreground">Needs a separate quote</Badge>
          </p>
          <ul className="mt-1.5 space-y-1">
            {excluded.map((l) => (
              <li key={l.itemId} className="text-caption text-muted">
                <span className="text-foreground">{l.name}</span>{l.quantity > 1 ? ` × ${l.quantity}` : ""}
                {l.description && <span className="block">“{l.description}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-caption text-muted">
        Prices shown as agreed on {formatDate(quote.acceptedAt)} — later catalogue changes do not affect this quotation.
      </p>
    </div>
  );
}
