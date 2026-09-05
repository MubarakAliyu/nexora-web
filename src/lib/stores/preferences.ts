import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/lib/mock/types";

/**
 * Cross-portal user preferences (F5, extended in G1).
 *
 * ONE store, read by all four portals — admin, owner, tenant and worker each
 * expose the same Global Preferences section rather than keeping their own copy.
 * Persisted per browser under `nexora-preferences`, alongside the other E1-layer
 * keys.
 *
 * ⚠️ G1 REVERSES AN F5 DECISION. F5 deliberately did not convert currency,
 * because the 27 Aug minutes said exchange-rate behaviour "was not defined and
 * must not be assumed". The client has since asked for conversion explicitly, so
 * changing `currency` now re-denominates every DISPLAYED amount using
 * `exchangeRate`. What has NOT changed:
 *
 *   - Each record still stores the currency it was recorded in. Nothing is
 *     overwritten, so the original is always retrievable.
 *   - Converted figures are marked (≈) and are indicative only.
 *   - Documents — invoices, receipts, statements — print the RECORDED currency
 *     as the authoritative figure.
 */
export interface PreferencesState {
  /** The currency amounts are DISPLAYED in, and that new records are created in. */
  currency: Currency;
  /**
   * G1 — how many UGX one USD buys. Admin-configured because no FX provider has
   * been selected; a live feed can replace this without touching display code.
   *
   * UGX → USD divides by it, USD → UGX multiplies. Placeholder until Finance
   * confirms — see `exchangeRateConfirmed`.
   */
  exchangeRate: number;
  /** False while the seeded placeholder rate is still in force. */
  exchangeRateConfirmed: boolean;
  exchangeRateUpdatedAt: string | null;
  exchangeRateUpdatedBy: string | null;
  /** Owner-only: how they want to hear about maintenance approvals. */
  approvalNotice: "immediate" | "daily_digest" | "email_only";
  setCurrency: (c: Currency) => void;
  setExchangeRate: (rate: number, actor: string) => void;
  setApprovalNotice: (v: PreferencesState["approvalNotice"]) => void;
}

/**
 * Placeholder rate — pending stakeholder confirmation.
 *
 * Roughly the mid-2026 UGX/USD level. It exists so the feature is demonstrable,
 * NOT because anyone has signed it off; the Settings UI says so, and
 * `exchangeRateConfirmed` stays false until an admin sets a real one.
 */
export const PLACEHOLDER_EXCHANGE_RATE = 3750;

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: "UGX",
      exchangeRate: PLACEHOLDER_EXCHANGE_RATE,
      exchangeRateConfirmed: false,
      exchangeRateUpdatedAt: null,
      exchangeRateUpdatedBy: null,
      approvalNotice: "immediate",
      setCurrency: (currency) => set({ currency }),
      setExchangeRate: (exchangeRate, actor) =>
        set({
          exchangeRate,
          exchangeRateConfirmed: true,
          exchangeRateUpdatedAt: new Date().toISOString(),
          exchangeRateUpdatedBy: actor,
        }),
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

/**
 * The rate in force right now, for stamping onto a record at creation (G1/A4).
 *
 * Snapshotting it is the same principle as F1's price snapshot: a record must
 * keep converting at the rate that applied when it happened, or every past
 * transaction silently revalues the moment someone updates the rate.
 */
export const activeExchangeRate = (): number => usePreferences.getState().exchangeRate;
