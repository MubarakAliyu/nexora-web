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
  const { recordMutation } = await import("@/lib/api/actions");
  const service = (payload.meta?.service as string | undefined) ?? serviceByType[payload.type];
  const lead = addMarketingLead({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    message: payload.message,
    source: sourceByType[payload.type],
    service,
  });

  // Feed the CRM live: bump revision + notify staff + audit. The notification carries
  // entityType/entityId (via recordMutation) so clicking it opens this lead's detail.
  const notifyTitle: Record<LeadType, string> = {
    quote: "New quote request",
    assessment: "New assessment request",
    investor: "New investor enquiry",
    job: "New job application",
    contact: "New contact enquiry",
  };
  recordMutation({
    entityType: "lead",
    entityId: lead.id,
    entityName: lead.name,
    action: "created",
    summary: `New ${sourceByType[payload.type]} lead — ${lead.name} (${service}) · ${lead.reference}`,
    after: { reference: lead.reference, name: lead.name, source: lead.source, service },
    notify: {
      type: "system",
      title: notifyTitle[payload.type],
      body: `${lead.name} requested ${service} — ${lead.reference}`,
    },
  });

  return { ok: true, id: lead.id };
}
