/** Shared formatting helpers for the dashboard (currency, dates, etc.). */
import type { Currency } from "@/lib/mock/types";

/**
 * THE money formatter. Every amount displayed anywhere in the app goes through
 * this — there is deliberately no second way to render money. F5 consolidated
 * 262 call sites into it; G1 adds conversion without adding a second one.
 *
 * This function itself still does NOT convert — it formats the number it is
 * given in the currency it is given. That is what makes it correct for the api
 * layer, where audit summaries and notification bodies must quote the amount as
 * RECORDED. Display-side conversion is layered on top by `convertAmount` and the
 * `useMoney` hook, so there is exactly one place that renders a figure and
 * exactly one place that decides an exchange rate.
 *
 * `compact` (the default) abbreviates for dense UI: "UGX 2.8M", "USD 1.2K".
 * Pass `{ compact: false }` for invoices, receipts and anywhere an exact figure
 * matters.
 */
export function formatCurrency(
  n: number,
  currency: Currency = "UGX",
  opts?: { compact?: boolean },
): string {
  // USD conventionally shows cents; UGX has no minor unit in practice.
  const locale = currency === "USD" ? "en-US" : "en-UG";
  if (opts?.compact ?? true) {
    if (Math.abs(n) >= 1_000_000_000) return `${currency} ${(n / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (Math.abs(n) >= 1_000) return `${currency} ${(n / 1_000).toFixed(0)}K`;
  }
  const rounded = currency === "USD" ? n : Math.round(n);
  return `${currency} ${rounded.toLocaleString(locale, {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })}`;
}

/** Exact figure, never abbreviated — invoices, receipts, quotation lines. */
export function formatCurrencyFull(n: number, currency: Currency = "UGX"): string {
  return formatCurrency(n, currency, { compact: false });
}

/** The symbol/code shown beside an input. */
export const currencyLabel = (c: Currency) => (c === "USD" ? "USD ($)" : "UGX (Sh)");

/* ------------------------------------------------------ G1: conversion */

/**
 * Convert between the two supported currencies at a given rate.
 *
 * `rate` is always "how many UGX one USD buys", regardless of direction:
 *
 *   UGX → USD   amount / rate
 *   USD → UGX   amount * rate
 *
 * ROUNDING RULE: USD carries cents and is rounded to 2 decimal places; UGX has
 * no minor unit in practice and is rounded to whole shillings. Rounding happens
 * ONCE, here, at the point of conversion — never again downstream — so a figure
 * cannot drift by being formatted twice.
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number,
): number {
  if (from === to) return amount;
  if (!Number.isFinite(rate) || rate <= 0) return amount;
  const raw = to === "USD" ? amount / rate : amount * rate;
  return to === "USD" ? Math.round(raw * 100) / 100 : Math.round(raw);
}

export interface MoneyView {
  /** What to show, e.g. "≈ USD 20,667.33" or "UGX 77,502,500". */
  text: string;
  /** True when the figure has been converted from another currency. */
  converted: boolean;
  /** The amount as recorded, formatted in its own currency. Always available. */
  originalText: string;
  originalAmount: number;
  originalCurrency: Currency;
  /** The rate used, when converted. */
  rateUsed: number | null;
  /** True when no rate was stored on the record and today's was used instead. */
  usedFallbackRate: boolean;
  /** Ready-made tooltip explaining the conversion. */
  title: string;
}

/**
 * Format an amount for DISPLAY, converting into `displayCurrency` if needed.
 *
 * The original is never destroyed — it comes back on the result so a converted
 * figure can always be traced to what was actually recorded. Converted values
 * are prefixed "≈" because they are indicative: nobody was billed them and
 * nobody was paid them.
 *
 * `rateAtCreation` is the rate stored on the record (G1/A4). Historical records
 * convert at THEIR rate so past transactions do not revalue when the current
 * rate moves. Pre-G1 rows have none, so the current rate is used and the result
 * is flagged `usedFallbackRate` for the UI to disclose.
 */
export function formatMoney(
  amount: number,
  recordCurrency: Currency | undefined,
  displayCurrency: Currency,
  currentRate: number,
  opts?: { compact?: boolean; rateAtCreation?: number | null },
): MoneyView {
  const from: Currency = recordCurrency ?? "UGX";
  const originalText = formatCurrency(amount, from, opts);

  if (from === displayCurrency) {
    return {
      text: originalText,
      converted: false,
      originalText,
      originalAmount: amount,
      originalCurrency: from,
      rateUsed: null,
      usedFallbackRate: false,
      title: originalText,
    };
  }

  const stored = opts?.rateAtCreation;
  const usedFallbackRate = stored == null || !Number.isFinite(stored) || stored <= 0;
  const rate = usedFallbackRate ? currentRate : (stored as number);
  const converted = convertAmount(amount, from, displayCurrency, rate);
  const text = `≈ ${formatCurrency(converted, displayCurrency, opts)}`;

  return {
    text,
    converted: true,
    originalText,
    originalAmount: amount,
    originalCurrency: from,
    rateUsed: rate,
    usedFallbackRate,
    title:
      `Recorded as ${originalText} · rate ${rate.toLocaleString("en-UG")}` +
      (usedFallbackRate ? " (current rate — no rate stored on this record)" : "") +
      ". Converted figures are indicative.",
  };
}

/** "10 Jul 2026". Stable formatting (en-GB) to avoid locale drift. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "10 Jul" — short form for dense tables. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Relative-ish label anchored to the fixed mock "now". */
export function fromNow(iso: string, nowIso: string): string {
  const diff = new Date(nowIso).getTime() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.round(diff / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}
