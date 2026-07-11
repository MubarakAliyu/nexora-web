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

const sourceByType: Record<LeadType, string> = {
  quote: "Website — Quote",
  assessment: "Website — Assessment",
  investor: "Investor page",
  job: "Careers",
  contact: "Website — Contact",
};
const serviceByType: Record<LeadType, string> = {
  quote: "Property Management",
  assessment: "Property assessment",
  investor: "Investment advisory",
  job: "Job application",
  contact: "General enquiry",
};

/** Simulates POST /api/leads and feeds the shared CRM registry so the lead
 *  surfaces live in the admin CRM (/admin/leads). Replace at integration. */
export async function submitLead(payload: LeadPayload): Promise<LeadResponse> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (typeof console !== "undefined") {
    console.info("[mock] submitLead", payload);
  }

  const { addMarketingLead } = await import("@/lib/mock/db");
  const service = (payload.meta?.service as string | undefined) ?? serviceByType[payload.type];
  const lead = addMarketingLead({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    message: payload.message,
    source: sourceByType[payload.type],
    service,
  });

  return { ok: true, id: lead.id };
}
