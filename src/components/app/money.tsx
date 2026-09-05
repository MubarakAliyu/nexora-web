"use client";

/**
 * Money display (G1/A2, A3).
 *
 * ONE place renders a monetary figure in the UI. It reads the display currency
 * and exchange rate from the preferences store, converts if the record was
 * recorded in the other currency, and marks the result.
 *
 * ⚠️ A CONVERTED FIGURE IS NOT A REAL ONE. Nobody was billed it and nobody was
 * paid it, so it is prefixed "≈" and carries a tooltip naming the amount that
 * WAS recorded and the rate used. The original is never destroyed — it is on the
 * record and on the tooltip. Documents (invoices, receipts, statements) must
 * print the recorded currency instead; see `formatCurrencyFull` in the PDF
 * builders, which deliberately does not go through here.
 */
import * as React from "react";
import { usePreferences } from "@/lib/stores/preferences";
import { convertAmount, formatCurrencyRecordedFull, formatMoney, type MoneyView } from "@/lib/format";
import type { Currency } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion";

/**
 * Bind a formatter to the current display currency and rate.
 *
 * Components call `money(amount, record.currency, record.exchangeRateAtCreation)`
 * and get back a string; `view()` returns the full MoneyView when the caller
 * needs the tooltip or the converted flag.
 */
export function useMoney() {
  const displayCurrency = usePreferences((s) => s.currency);
  const rate = usePreferences((s) => s.exchangeRate);

  return React.useMemo(() => {
    const view = (
      amount: number,
      recordCurrency?: Currency,
      rateAtCreation?: number | null,
      opts?: { compact?: boolean },
    ): MoneyView =>
      formatMoney(amount, recordCurrency, displayCurrency, rate, {
        ...opts,
        rateAtCreation,
      });

    const money = (
      amount: number,
      recordCurrency?: Currency,
      rateAtCreation?: number | null,
      opts?: { compact?: boolean },
    ): string => view(amount, recordCurrency, rateAtCreation, opts).text;

    return { money, view, displayCurrency, rate };
  }, [displayCurrency, rate]);
}

/**
 * A rendered amount, with the conversion tooltip attached when it is converted.
 *
 * Prefer this over the bare `money()` string wherever there is room for a title
 * attribute — it is what makes the original retrievable at a glance.
 */
export function Money({
  amount,
  currency,
  rateAtCreation,
  compact,
  className,
}: {
  amount: number;
  currency?: Currency;
  rateAtCreation?: number | null;
  compact?: boolean;
  className?: string;
}) {
  const { view } = useMoney();
  const v = view(amount, currency, rateAtCreation, { compact });
  return (
    <span
      className={cn(v.converted && "underline decoration-dotted underline-offset-4", className)}
      title={v.converted ? v.title : undefined}
    >
      {v.text}
    </span>
  );
}

/**
 * An animated KPI figure (G1/A5).
 *
 * Dashboard StatCards used to render `UGX <CountUp/>M` inline, with the currency
 * code and the "M" unit hardcoded in three separate local `MoneyStat` helpers.
 * They never went through `formatCurrency`, so F5's consolidation did not reach
 * them and G1's conversion did not either — the classic read path built against
 * the old assumption. This is the one animated money component; use it wherever
 * a CountUp shows an amount.
 *
 * `compact` scales to K/M and picks the unit AFTER conversion, because UGX 639M
 * is USD 167K, not USD 0.2M.
 */
export function MoneyStat({
  value,
  currency = "UGX",
  rateAtCreation,
  compact = false,
  duration = 1.2,
}: {
  value: number;
  currency?: Currency;
  rateAtCreation?: number | null;
  compact?: boolean;
  duration?: number;
}) {
  const { displayCurrency, rate } = useMoney();
  const used = rateAtCreation != null && Number.isFinite(rateAtCreation) && rateAtCreation > 0 ? rateAtCreation : rate;
  const converted = currency !== displayCurrency;
  const shown = convertAmount(value, currency, displayCurrency, used);

  const abs = Math.abs(shown);
  let scaled = shown;
  let unit = "";
  if (compact) {
    if (abs >= 1_000_000) { scaled = shown / 1_000_000; unit = "M"; }
    else if (abs >= 1_000) { scaled = shown / 1_000; unit = "K"; }
  }
  const decimals = compact
    ? (unit === "" ? (displayCurrency === "USD" ? 2 : 0) : Math.abs(scaled) < 100 ? 1 : 0)
    : (displayCurrency === "USD" ? 2 : 0);

  return (
    <span
      className={converted ? "underline decoration-dotted underline-offset-4" : undefined}
      title={
        converted
          ? `Recorded as ${formatCurrencyRecordedFull(value, currency)} · converted at 1 USD = ${used.toLocaleString("en-UG")} UGX`
          : undefined
      }
    >
      {converted ? "≈ " : ""}
      {displayCurrency} <CountUp to={scaled} decimals={decimals} duration={duration} immediate />
      {unit}
    </span>
  );
}

/**
 * The unit caption that sits beside a money chart ("UGX M · last 6 months").
 * Charts plot recorded UGX millions; when the display currency moves the axis
 * moves with it, so the caption has to as well.
 */
export function useMoneyChartUnit(): { code: Currency; divisor: number; unit: string; label: string } {
  const { displayCurrency, rate } = useMoney();
  if (displayCurrency === "UGX") return { code: "UGX", divisor: 1, unit: "M", label: "UGX M" };
  // 1M UGX at 3,750 is ~267 USD, so USD reads naturally in thousands.
  return { code: "USD", divisor: rate / 1000, unit: "K", label: "≈ USD K" };
}
