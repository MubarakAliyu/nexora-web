/**
 * Mocked lead-capture data-access layer. Mirrors the Nexora PRD lead registry
 * shape so it can be swapped for the Django REST endpoints later — the UI only
 * depends on `submitLead()`.
 */

export type LeadType =
  | "quote"
  | "assessment"
  | "investor"
  | "job"
  | "contact";

export interface LeadPayload {
  type: LeadType;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  /** Extra typed fields per lead form (service, budget, position, …). */
  meta?: Record<string, unknown>;
}

export interface LeadResponse {
  ok: true;
  id: string;
}

/** Simulates POST /api/leads. Replace with the real endpoint at integration. */
export async function submitLead(payload: LeadPayload): Promise<LeadResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  // Surface the payload during development so it's clear the form wired up.
  if (typeof console !== "undefined") {
    console.info("[mock] submitLead", payload);
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());

  return { ok: true, id };
}
