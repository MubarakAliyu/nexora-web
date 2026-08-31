import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/lib/mock/types";

/**
 * Cross-portal user preferences (F5).
 *
 * ONE store, read by all four portals — admin, owner, tenant and worker each
 * expose the same Global Preferences section rather than keeping their own copy.
 * Persisted per browser under `nexora-preferences`, alongside the other E1-layer
 * keys.
 *
 * ⚠️ CURRENCY IS A PREFERENCE FOR NEW RECORDS AND UNSCOPED TOTALS ONLY.
 * It never re-denominates an existing record: the 27 Aug minutes ruled out
 * assuming exchange-rate behaviour, so an invoice raised in UGX is displayed in
 * UGX no matter what this is set to. See `formatCurrency`.
 */
export interface PreferencesState {
  /** Currency NEW records are created in, and the default for unscoped totals. */
  currency: Currency;
  /** Owner-only: how they want to hear about maintenance approvals. */
  approvalNotice: "immediate" | "daily_digest" | "email_only";
  setCurrency: (c: Currency) => void;
  setApprovalNotice: (v: PreferencesState["approvalNotice"]) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: "UGX",
      approvalNotice: "immediate",
      setCurrency: (currency) => set({ currency }),
      setApprovalNotice: (approvalNotice) => set({ approvalNotice }),
    }),
    { name: "nexora-preferences" },
  ),
);

/**
 * The active currency, readable OUTSIDE React (api layer, record creation).
 *
 * Components should use `usePreferences((s) => s.currency)` so a change
 * re-renders them; this is for the write path, where a new record needs to be
 * stamped with the currency it is being created in.
 */
export const activeCurrency = (): Currency => usePreferences.getState().currency;
