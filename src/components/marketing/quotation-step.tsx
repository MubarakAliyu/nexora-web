"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { buildQuotation } from "@/lib/api/catalogue";
import type { CatalogueSelection } from "./catalogue-step";

const fmt = (n: number, c: string) => `${c} ${Math.round(n).toLocaleString("en-UG")}`;

/**
 * Quotation review + agreement.
 *
 * The customer sees exactly what they are agreeing to before any money moves —
 * that was the whole point of the 27 Aug reversal. Items flagged for separate
 * quotation are listed but deliberately kept out of the total, so the figure the
 * customer accepts is the figure they pay.
 */
export function QuotationStep({
  serviceTypeId, selection, agreed, onAgreedChange, address, dateLabel, time,
}: {
  serviceTypeId: string;
  selection: CatalogueSelection;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  address?: string;
  dateLabel?: string;
  time?: string;
}) {
  const quote = React.useMemo(() => {
    const lines = Object.entries(selection)
      .filter(([, v]) => v.quantity > 0)
      .map(([itemId, v]) => ({ itemId, quantity: v.quantity, description: v.description }));
    return buildQuotation(serviceTypeId, lines);
  }, [serviceTypeId, selection]);

  const counted = quote.lines.filter((l) => !l.excludedFromTotal);
  const excluded = quote.lines.filter((l) => l.excludedFromTotal);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-h2 font-semibold text-foreground">Review your quotation</h2>
        <p className="mt-1 text-body text-muted">{quote.serviceTypeName}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-body">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-2.5 text-left text-caption font-semibold uppercase tracking-wide text-muted">Item</th>
              <th className="px-3 py-2.5 text-center text-caption font-semibold uppercase tracking-wide text-muted">Qty</th>
              <th className="px-3 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-muted">Unit price</th>
              <th className="px-4 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {counted.map((l) => (
              <tr key={l.itemId} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <span className="text-foreground">{l.name}</span>
                  <span className="block text-caption text-muted">{l.unit}</span>
                </td>
                <td className="px-3 py-2.5 text-center text-foreground">{l.quantity}</td>
                <td className="px-3 py-2.5 text-right text-muted">{fmt(l.unitPriceAtBooking, quote.currency)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(l.lineTotal, quote.currency)}</td>
              </tr>
            ))}
            {counted.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={4} className="px-4 py-6 text-center text-muted">Nothing selected yet.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-hover/60">
              <td colSpan={3} className="px-4 py-2.5 text-right text-muted">Subtotal</td>
              <td className="px-4 py-2.5 text-right text-foreground">{fmt(quote.subtotal, quote.currency)}</td>
            </tr>
            <tr className="border-t border-primary/30 bg-primary/5">
              <td colSpan={3} className="px-4 py-3 text-right font-medium text-foreground">Total</td>
              <td className="px-4 py-3 text-right font-heading text-h3 font-semibold text-primary">
                {fmt(quote.total, quote.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {excluded.length > 0 && (
        <div className="rounded-xl border border-accent/40 bg-surface-hover p-4">
          <p className="text-body font-medium text-foreground">To be quoted separately — not included in this total</p>
          <ul className="mt-2 space-y-1.5">
            {excluded.map((l) => (
              <li key={l.itemId} className="text-caption text-muted">
                <span className="text-foreground">{l.name}</span>
                {l.quantity > 1 && ` × ${l.quantity}`}
                {l.description && <span className="block">“{l.description}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="space-y-1.5 rounded-xl border border-border p-4 text-body">
        {address && <div className="flex justify-between gap-4"><dt className="text-muted">Service address</dt><dd className="text-right text-foreground">{address}</dd></div>}
        {dateLabel && <div className="flex justify-between gap-4"><dt className="text-muted">Preferred date</dt><dd className="text-right text-foreground">{dateLabel}</dd></div>}
        {time && <div className="flex justify-between gap-4"><dt className="text-muted">Preferred time</dt><dd className="text-right text-foreground">{time}</dd></div>}
      </dl>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start gap-2.5">
          <Checkbox id="q-agree" checked={agreed} onCheckedChange={(v) => onAgreedChange(v === true)} className="mt-0.5" />
          <Label htmlFor="q-agree" className="font-normal text-foreground">
            I have reviewed the scope and agree to this quotation
          </Label>
        </div>
        <p className="mt-2 pl-7 text-caption text-muted">
          Work will be scheduled once payment is confirmed. Any additional work discovered on site
          will be quoted and agreed separately before it proceeds.
        </p>
      </div>
    </div>
  );
}
