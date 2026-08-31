/** Shared formatting helpers for the dashboard (currency, dates, etc.). */
import type { Currency } from "@/lib/mock/types";

/**
 * THE money formatter. Every amount displayed anywhere in the app goes through
 * this — there is deliberately no second way to render money.
 *
 * ⚠️ NO CONVERSION. It formats the number it is given IN THE CURRENCY IT IS
 * GIVEN. The 27 Aug minutes were explicit that exchange-rate behaviour "was not
 * defined and must not be assumed", so an amount recorded in UGX renders as UGX
 * even for a user whose preference is USD. Passing a record's own `currency` is
 * therefore not optional politeness — it is the correctness requirement.
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
