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
import { formatMoney, type MoneyView } from "@/lib/format";
import type { Currency } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

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
