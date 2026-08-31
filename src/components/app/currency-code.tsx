"use client";

import { usePreferences } from "@/lib/stores/preferences";

/**
 * The active currency code, live (F5).
 *
 * Money input labels used to read "Amount (UGX)" as a hardcoded string while the
 * record they created took whatever the user's currency preference was — so an
 * admin working in USD typed into a field labelled UGX and got a USD record.
 * This subscribes to the preference, so the label tells the truth.
 *
 * Use it inside a Field label: label={<>Amount (<CurrencyCode />)</>}
 */
export function CurrencyCode() {
  return <>{usePreferences((s) => s.currency)}</>;
}
