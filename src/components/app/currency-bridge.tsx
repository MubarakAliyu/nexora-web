"use client";

/**
 * Keeps `format.ts`'s display context in sync with the preferences store (G1/A2).
 *
 * WHY A BRIDGE RATHER THAN A HOOK. `formatCurrency` is called from roughly 262
 * sites, and a good number of them are module-scope table-column definitions
 * where a React hook is impossible. Threading a hook through all of them would
 * mean re-touching every site F5 just consolidated. Instead the active currency
 * and rate live in a module-level holder that this component writes on every
 * change, and `useCurrencyKey` re-keys the portal shell so the whole subtree
 * re-renders and re-reads. Keyed remount is the same pattern the animation rule
 * already uses.
 *
 * The write happens during render, not in an effect, so the very first paint
 * after a change already formats in the new currency.
 */
import { usePreferences, activeExchangeRate } from "@/lib/stores/preferences";
import { setDisplayContext } from "@/lib/format";

/**
 * Pin the display context back to the recorded base currency for a subtree.
 */
export function useRecordedCurrencyBoundary(): void {
  // G1/A5 — the public site quotes the price a visitor will actually be charged.
  // There is no visitor-facing currency control, and a marketing price becomes
  // the recorded amount of the booking that follows, so an admin's USD
  // preference must not leak across into it via the module-level holder.
  setDisplayContext("UGX", activeExchangeRate());
}

/**
 * A key that changes whenever the display currency or rate changes.
 *
 * Put it on the element wrapping a portal's content: `<div key={useCurrencyKey()}>`.
 */
export function useCurrencyKey(): string {
  const currency = usePreferences((s) => s.currency);
  const rate = usePreferences((s) => s.exchangeRate);
  // Render-phase write: cheap, idempotent, and ordered before any child formats.
  setDisplayContext(currency, rate);
  return `${currency}:${rate}`;
}
