"use client";

import * as React from "react";
import { formatCurrencyFull } from "@/lib/format";
import { CheckCircle, ExclamationCircle } from "flowbite-react-icons/outline";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { catalogueTree, type CatalogueTree } from "@/lib/api/catalogue";
import type { CatalogueItem, ServiceCategory, Currency} from "@/lib/mock/types";

/** What the customer has picked. itemId → quantity (+ optional free-text detail). */
export interface CatalogueSelection {
  [itemId: string]: { quantity: number; description?: string };
}

export interface CatalogueTotals {
  subtotal: number;
  currency: string;
  /** Lines the customer picked that are quoted separately, not counted. */
  excludedCount: number;
}

const fmt = (n: number, c: string) => formatCurrencyFull(n, c as Currency);

/* --------------------------------------------------------------- helpers */

/** Derive the running total from the LIVE catalogue. Never from anything hardcoded. */
export function computeTotals(tree: CatalogueTree | null, selection: CatalogueSelection): CatalogueTotals {
  let subtotal = 0;
  let excludedCount = 0;
  let currency = "UGX";
  if (!tree) return { subtotal, currency, excludedCount };
  for (const { items } of tree.categories) {
    for (const item of items) {
      const sel = selection[item.id];
      if (!sel || sel.quantity <= 0) continue;
      currency = item.currency;
      if (item.excludeFromTotal) excludedCount++;
      else subtotal += item.price * sel.quantity;
    }
  }
  return { subtotal, currency, excludedCount };
}

/** Required categories with nothing chosen, and "Other" items missing their detail. */
export function validateSelection(tree: CatalogueTree | null, selection: CatalogueSelection): string[] {
  const problems: string[] = [];
  if (!tree) return problems;
  for (const { category, items } of tree.categories) {
    const chosen = items.filter((i) => (selection[i.id]?.quantity ?? 0) > 0);
    if (category.required && chosen.length === 0) problems.push(`Choose an option under “${category.name}”.`);
    for (const item of chosen) {
      if (item.requiresDescription && !selection[item.id]?.description?.trim()) {
        problems.push(`Describe what you need for “${item.name}”.`);
      }
    }
  }
  return problems;
}

/* ----------------------------------------------------------- item widgets */

function Stepper({ item, value, onChange }: { item: CatalogueItem; value: number; onChange: (n: number) => void }) {
  const min = item.minQuantity ?? 0;
  const max = item.maxQuantity ?? 99;
  const btn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-h3 leading-none text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className={btn} aria-label={`Decrease ${item.name}`}
        disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="w-8 text-center text-body font-semibold text-foreground" aria-live="polite">{value}</span>
      <button type="button" className={btn} aria-label={`Increase ${item.name}`}
        disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

function ItemMeta({ item }: { item: CatalogueItem }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-body font-medium text-foreground">{item.name}</span>
      {item.description && <span className="mt-0.5 block text-caption text-muted">{item.description}</span>}
      <span className="mt-0.5 block text-caption text-muted">
        {item.excludeFromTotal
          ? "Quoted separately after review — not included in this total"
          : `${fmt(item.price, item.currency)} ${item.unit}`}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- step */

/**
 * The generic catalogue-driven pricing step.
 *
 * It knows nothing about cleaning, laundry or car washes. It reads the service
 * type's active categories and renders each one according to its `selectionMode`,
 * which is why a brand-new service type created in the admin UI gets a working
 * booking form with no code change at all.
 */
export function CatalogueStep({ serviceTypeId, selection, onChange }: {
  serviceTypeId: string;
  selection: CatalogueSelection;
  onChange: (next: CatalogueSelection) => void;
}) {
  // activeOnly — anything the admin deactivates simply stops appearing here.
  const tree = React.useMemo(
    () => catalogueTree(serviceTypeId, true),
    [serviceTypeId],
  );

  const setQty = (item: CatalogueItem, quantity: number) => {
    const next = { ...selection };
    if (quantity <= 0) delete next[item.id];
    else next[item.id] = { ...next[item.id], quantity };
    onChange(next);
  };

  const setDescription = (item: CatalogueItem, description: string) => {
    onChange({ ...selection, [item.id]: { quantity: selection[item.id]?.quantity ?? 1, description } });
  };

  const pickOne = (category: ServiceCategory, items: CatalogueItem[], item: CatalogueItem) => {
    const next = { ...selection };
    items.forEach((i) => { delete next[i.id]; });
    next[item.id] = { quantity: 1, description: selection[item.id]?.description };
    onChange(next);
  };

  const hasAnyItems = !!tree && tree.categories.some((c) => c.items.length > 0);
  const totals = computeTotals(tree, selection);

  if (!hasAnyItems) {
    return (
      <div className="rounded-xl border border-border bg-surface-hover p-8 text-center">
        <ExclamationCircle size={24} className="mx-auto text-muted" />
        <p className="mt-3 text-body font-medium text-foreground">This service is being updated.</p>
        <p className="mt-1 text-caption text-muted">Please contact us to book.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!tree!.serviceType.pricesConfirmed && (
        <p className="rounded-lg border border-border bg-surface-hover px-3.5 py-2.5 text-caption text-muted">
          Indicative pricing — your final quotation is confirmed before any payment is taken.
        </p>
      )}

      {tree!.categories.filter((c) => c.items.length > 0).map(({ category, items }) => (
        <section key={category.id}>
          <div className="mb-3">
            <h3 className="font-heading text-body font-semibold text-foreground">
              {category.name}
              {category.required && <span className="ml-1.5 text-caption font-normal text-primary">Required</span>}
            </h3>
            {category.description && <p className="mt-0.5 text-caption text-muted">{category.description}</p>}
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const qty = selection[item.id]?.quantity ?? 0;
              const chosen = qty > 0;

              /* quantity → stepper rows */
              if (category.selectionMode === "quantity") {
                return (
                  <div key={item.id}>
                    <div className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      chosen ? "border-primary/40 bg-primary/5" : "border-border",
                    )}>
                      <ItemMeta item={item} />
                      <Stepper item={item} value={qty} onChange={(n) => setQty(item, n)} />
                    </div>
                    {chosen && item.requiresDescription && (
                      <div className="mt-2 motion-safe:animate-in motion-safe:fade-in">
                        <Textarea
                          rows={2}
                          value={selection[item.id]?.description ?? ""}
                          onChange={(e) => setDescription(item, e.target.value)}
                          placeholder={`Describe the ${item.name.toLowerCase()} so we can quote it`}
                          aria-label={`Description for ${item.name}`}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              /* single_choice → radio cards */
              if (category.selectionMode === "single_choice") {
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-primary",
                      chosen ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`cat-${category.id}`}
                      checked={chosen}
                      onChange={() => pickOne(category, items, item)}
                      className="h-4 w-4 shrink-0 text-primary"
                    />
                    <ItemMeta item={item} />
                    {chosen && <CheckCircle size={18} className="shrink-0 text-primary" />}
                  </label>
                );
              }

              /* multi_choice → checkbox rows */
              return (
                <label
                  key={item.id}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-primary",
                    chosen ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={chosen}
                    onChange={() => setQty(item, chosen ? 0 : 1)}
                    className="h-4 w-4 shrink-0 rounded text-primary"
                  />
                  <ItemMeta item={item} />
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {/* Live running total — catalogue values only */}
      <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 backdrop-blur">
        <div>
          <p className="text-caption uppercase tracking-wide text-muted">Estimated total</p>
          {totals.excludedCount > 0 && (
            <p className="mt-0.5 text-caption text-muted">
              {totals.excludedCount} item{totals.excludedCount === 1 ? "" : "s"} quoted separately
            </p>
          )}
        </div>
        <p className="font-heading text-h2 font-semibold text-primary">{fmt(totals.subtotal, totals.currency)}</p>
      </div>
    </div>
  );
}
