/**
 * Maintenance assessment, payer routing and owner approval (F3).
 *
 * E4 asked "who pays?" when the ticket was closed. The 27 Aug meeting established
 * that is too late — by then the money has already been spent. The decision moves
 * to after the assessment and before any work, and owner-liable work above a
 * configurable threshold has to be approved by the owner first.
 *
 * E4's three financial branches at CLOSURE are untouched. What changed is when the
 * decision is made, and what has to happen before a technician is dispatched.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify, resolveStaff } from "@/lib/api/admin-mutations";
import type {
  MaintenanceTicket, TicketStatus, ChargeTo, Invoice,
} from "@/lib/mock/types";

const mDelay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;

const pName = (id: string) => db.properties.find((p) => p.id === id)?.name ?? "the property";
const uLabel = (id?: string) => db.units.find((u) => u.id === id)?.label ?? "the unit";
const tName = (id?: string) => db.tenants.find((t) => t.id === id)?.name ?? "the tenant";
const ownerOf = (propertyId: string) =>
  db.owners.find((o) => o.id === db.properties.find((p) => p.id === propertyId)?.ownerId);

/* ---------------------------------------------------------------- statuses */

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  assessed: "Assessed",
  awaiting_owner_approval: "Awaiting Owner Approval",
  owner_approved: "Owner Approved",
  owner_declined: "Owner Declined",
  awaiting_tenant_payment: "Awaiting Tenant Payment",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

/**
 * Which statuses may follow. The point of the gating is that you cannot get from
 * `assessed` to work starting without passing through routing and whichever gate
 * that routing implies — approval or payment.
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["assigned", "closed"],
  assigned: ["assessed", "closed"],
  assessed: ["awaiting_owner_approval", "awaiting_tenant_payment", "scheduled", "closed"],
  awaiting_owner_approval: ["owner_approved", "owner_declined"],
  owner_approved: ["scheduled"],
  owner_declined: ["closed"],
  awaiting_tenant_payment: ["scheduled", "closed"],
  scheduled: ["in_progress", "closed"],
  in_progress: ["completed", "closed"],
  completed: ["closed", "in_progress"],
  closed: [],
};

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Why a transition is blocked — shown on the disabled option. */
export function ticketTransitionHint(from: TicketStatus, to: TicketStatus): string {
  if (canTransitionTicket(from, to)) return "";
  if (from === "closed") return "This ticket is closed.";
  if (from === "assessed" && (to === "in_progress" || to === "completed")) {
    return "Route the charge first — work cannot start before the payer is decided.";
  }
  if (from === "awaiting_owner_approval") return "Waiting on the owner's decision.";
  if (from === "awaiting_tenant_payment") return "Waiting on the tenant's payment.";
  return `Not reachable from ${TICKET_STATUS_LABEL[from]}.`;
}

/* --------------------------------------------------------------- threshold */

/**
 * Owner approval threshold. Placeholder pending stakeholder confirmation — the
 * meeting did not settle on a figure. Stored in the settings store so an admin can
 * change it; the constant is only the initial value.
 */
export const DEFAULT_OWNER_APPROVAL_THRESHOLD = 500_000;

let ownerApprovalThreshold = DEFAULT_OWNER_APPROVAL_THRESHOLD;

export function getOwnerApprovalThreshold(): number {
  return ownerApprovalThreshold;
}

export async function setOwnerApprovalThreshold(next: number, actor: string): Promise<number> {
  await mDelay(250);
  const before = ownerApprovalThreshold;
  ownerApprovalThreshold = Math.max(0, Math.round(next));
  recordMutation({
    entityType: "settings", entityId: "owner_approval_threshold", entityName: "Owner approval threshold",
    action: "updated",
    summary: `Owner approval threshold changed from ${money(before)} to ${money(ownerApprovalThreshold)} by ${actor}`,
    before: { threshold: before }, after: { threshold: ownerApprovalThreshold },
    notify: {
      type: "system", title: "Approval threshold updated",
      body: `Owner approval is now required above ${money(ownerApprovalThreshold)}.`,
    },
  });
  return ownerApprovalThreshold;
}

/** What the system proposes. A hint only — never auto-selected. */
export function suggestedRoute(t: MaintenanceTicket): { route: ChargeTo | null; why: string } {
  const cost = t.assessedCost ?? 0;
  if (cost >= ownerApprovalThreshold) {
    return {
      route: "owner",
      why: `Suggested: Owner — exceeds the approval threshold of ${money(ownerApprovalThreshold)}`,
    };
  }
  return { route: null, why: "No suggestion — decide based on the cause of the fault." };
}

/* -------------------------------------------------------------- assessment */

export interface AssessmentInput {
  assessedBy: string;
  assessedAt: string;
  labour: number;
  materials: number;
  notes: string;
}

export async function recordAssessment(id: string, input: AssessmentInput): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  const before = { status: t.status };
  const total = (input.labour || 0) + (input.materials || 0);
  const staff = resolveStaff(input.assessedBy);

  t.assessedLabour = input.labour;
  t.assessedMaterials = input.materials;
  t.assessedCost = total;
  t.assessedBy = staff?.id ?? input.assessedBy;
  t.assessedAt = new Date(input.assessedAt).toISOString();
  t.assessmentNotes = input.notes.trim();
  t.status = "assessed";
  t.updatedAt = db.NOW_ISO;

  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `Assessment recorded on ${t.ref} by ${staff?.name ?? input.assessedBy} — ${money(total)} estimated (${input.notes.trim()})`,
    before, after: { status: "assessed", assessedCost: total, assessedBy: t.assessedBy },
    notify: {
      type: "maintenance", title: "Assessment complete",
      body: `Assessment complete — ${t.ref}, ${t.title}, ${money(total)} estimated.`,
    },
  });
  pushNotify("maintenance", "Your request has been assessed",
    "Your maintenance request has been assessed. We will confirm next steps shortly.",
    "ticket", id);
  return t;
}

/* ----------------------------------------------------------------- routing */

export interface RouteChargeInput {
  chargeTo: ChargeTo;
  reason: string;
  decidedBy: string;
  /** Set when the manager routed against the suggestion. */
  overrideReason?: string;
  /** Only used for the tenant branch. */
  invoiceDueDate?: string;
}

export async function routeCharge(id: string, input: RouteChargeInput): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  const before = { status: t.status, chargeTo: t.chargeTo };

  const suggestion = suggestedRoute(t);
  const overrode = !!suggestion.route && suggestion.route !== input.chargeTo;
  const cost = t.assessedCost ?? 0;
  const property = pName(t.propertyId);
  const unit = uLabel(t.unitId);

  t.chargeTo = input.chargeTo;
  t.chargeToReason = input.reason.trim();
  t.chargeToDecidedBy = input.decidedBy;
  t.chargeToDecidedAt = db.NOW_ISO;
  t.routingOverridden = overrode;
  t.routingOverrideReason = overrode ? (input.overrideReason?.trim() || null) : null;
  t.updatedAt = db.NOW_ISO;

  /* ---- TENANT: invoice now, work waits for payment ---- */
  if (input.chargeTo === "tenant") {
    const number = `INV-${t.ref}`;
    const due = input.invoiceDueDate
      ? new Date(input.invoiceDueDate).toISOString()
      : new Date(Date.now() + 14 * 86_400_000).toISOString();
    const tenantRec = db.tenants.find((x) => x.id === t.tenantId);
    const invoice: Invoice = {
      id: `inv_mt_${Date.now()}`,
      number,
      leaseId: tenantRec?.leaseId ?? "",
      tenantId: t.tenantId ?? "",
      propertyId: t.propertyId,
      kind: "maintenance",
      issued: db.NOW_ISO,
      due,
      amount: cost,
      paid: 0,
      status: "pending",
      maintenanceTicketId: t.id,
      clientName: tenantRec?.name,
    };
    db.invoices.unshift(invoice);
    t.invoiceId = invoice.id;
    t.invoiceNumber = number;
    t.invoiceAmount = cost;
    t.invoiceDueDate = due;
    t.invoiceGeneratedAt = db.NOW_ISO;
    t.paymentStatus = "awaiting_payment";
    t.ownerApprovalStatus = "not_required";
    t.requiresOwnerApproval = false;
    t.status = "awaiting_tenant_payment";

    recordMutation({
      entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
      summary: `${t.ref} routed to TENANT — ${money(cost)} invoiced as ${number} (${t.chargeToReason})${overrode ? " [OVERRIDE: " + t.routingOverrideReason + "]" : ""}`,
      before, after: { status: t.status, chargeTo: "tenant", invoiceNumber: number, overridden: overrode },
      notify: {
        type: "payment", title: "Maintenance charge routed to tenant",
        body: `${t.ref} — ${money(cost)} invoiced to ${tName(t.tenantId)} as ${number}.`,
      },
    });
    pushNotify("payment", "Maintenance charge",
      `Maintenance charge — ${t.title}. Amount due: ${money(cost)}. Invoice ${number}. Work will be scheduled once payment is received.`,
      "ticket", id);
    return t;
  }

  /* ---- OWNER: approval gate above the threshold ---- */
  if (input.chargeTo === "owner") {
    const owner = ownerOf(t.propertyId);
    const needsApproval = cost >= ownerApprovalThreshold;
    t.requiresOwnerApproval = needsApproval;

    if (needsApproval) {
      t.ownerApprovalStatus = "awaiting";
      t.ownerApprovalRequestedAt = db.NOW_ISO;
      t.status = "awaiting_owner_approval";

      recordMutation({
        entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
        summary: `${t.ref} routed to OWNER — ${money(cost)} exceeds the ${money(ownerApprovalThreshold)} threshold, awaiting ${owner?.name ?? "owner"} approval (${t.chargeToReason})${overrode ? " [OVERRIDE: " + t.routingOverrideReason + "]" : ""}`,
        before, after: { status: t.status, chargeTo: "owner", requiresOwnerApproval: true, overridden: overrode },
        notify: {
          type: "maintenance", title: "Owner approval requested",
          body: `${t.ref} — ${money(cost)} sent to ${owner?.name ?? "the owner"} for approval.`,
        },
      });
      // Owner-directed: the tenant must not see that the owner is being asked, nor
      // the cost being put to them.
      pushNotify("maintenance", "Maintenance approval required",
        `Maintenance approval required — ${property}, ${unit}. ${t.title}. Estimated cost ${money(cost)}. Please review and approve.`,
        "ticket", id, "updated", ["owner"]);
      return t;
    }

    // Below threshold: the owner is told, not asked.
    t.ownerApprovalStatus = "not_required";
    t.status = "scheduled";
    recordMutation({
      entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
      summary: `${t.ref} routed to OWNER — ${money(cost)} is below the ${money(ownerApprovalThreshold)} threshold, scheduled without approval (${t.chargeToReason})${overrode ? " [OVERRIDE: " + t.routingOverrideReason + "]" : ""}`,
      before, after: { status: "scheduled", chargeTo: "owner", requiresOwnerApproval: false, overridden: overrode },
      notify: {
        type: "maintenance", title: "Maintenance scheduled",
        body: `${t.ref} — ${money(cost)} charged to ${owner?.name ?? "the owner"}, below the approval threshold.`,
      },
    });
    pushNotify("maintenance", "Maintenance approved",
      `Maintenance approved for ${property}, ${unit} — ${t.title}, ${money(cost)}. This will appear as a property expense in your settlement.`,
      "ticket", id, "updated", ["owner"]);
    return t;
  }

  /* ---- NEXORA: absorbed, straight to scheduling ---- */
  t.ownerApprovalStatus = "not_required";
  t.requiresOwnerApproval = false;
  t.status = "scheduled";
  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `${t.ref} routed to NEXORA — ${money(cost)} absorbed, scheduled (${t.chargeToReason})${overrode ? " [OVERRIDE: " + t.routingOverrideReason + "]" : ""}`,
    before, after: { status: "scheduled", chargeTo: "nexora", overridden: overrode },
    notify: {
      type: "maintenance", title: "Cost absorbed by Nexora",
      body: `${t.ref} — ${money(cost)} absorbed by Nexora, work scheduled.`,
    },
  });
  pushNotify("maintenance", "Your request has been approved",
    "Your maintenance request has been approved at no cost to you.", "ticket", id);
  return t;
}

/* ---------------------------------------------------------- owner approval */

export function ticketsAwaitingOwnerApproval(ownerId: string): MaintenanceTicket[] {
  const propertyIds = new Set(
    db.properties.filter((p) => p.ownerId === ownerId).map((p) => p.id),
  );
  return db.tickets
    .filter((t) => t.status === "awaiting_owner_approval" && propertyIds.has(t.propertyId))
    .sort((a, b) => ((a.ownerApprovalRequestedAt ?? "") < (b.ownerApprovalRequestedAt ?? "") ? -1 : 1));
}

export function allTicketsAwaitingApproval(): MaintenanceTicket[] {
  return db.tickets.filter((t) => t.status === "awaiting_owner_approval");
}

/** Hours a ticket has been waiting on its owner. Drives the 48-hour flag. */
export function hoursAwaiting(t: MaintenanceTicket): number {
  if (!t.ownerApprovalRequestedAt) return 0;
  return Math.max(0, Math.round((Date.parse(db.NOW_ISO) - Date.parse(t.ownerApprovalRequestedAt)) / 3_600_000));
}

export function waitingLabel(t: MaintenanceTicket): string {
  const h = hoursAwaiting(t);
  if (h < 1) return "just now";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

export async function approveMaintenance(id: string, approverName: string): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  const before = { status: t.status, ownerApprovalStatus: t.ownerApprovalStatus };
  const owner = ownerOf(t.propertyId);

  t.ownerApprovalStatus = "approved";
  t.ownerApprovedBy = owner?.id ?? null;
  t.ownerApprovedAt = db.NOW_ISO;
  t.status = "scheduled";
  t.updatedAt = db.NOW_ISO;

  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `${t.ref} approved by ${approverName} at ${money(t.assessedCost ?? 0)} — work may proceed`,
    before, after: { status: "scheduled", ownerApprovalStatus: "approved" },
    notify: {
      type: "maintenance", title: "Owner approved",
      body: `Owner approved — ${t.ref}, ${pName(t.propertyId)}, work may proceed.`,
    },
  });
  pushNotify("maintenance", "Your maintenance request has been approved",
    "Your maintenance request has been approved and will be scheduled.", "ticket", id);
  return t;
}

export async function declineMaintenance(id: string, reason: string, approverName: string): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  const before = { status: t.status, ownerApprovalStatus: t.ownerApprovalStatus };

  t.ownerApprovalStatus = "declined";
  t.ownerDeclineReason = reason.trim();
  t.ownerApprovedAt = db.NOW_ISO;
  t.status = "closed";
  t.closedAt = db.NOW_ISO;
  t.resolution = `Not proceeding — declined by owner.`;
  t.updatedAt = db.NOW_ISO;

  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `${t.ref} declined by ${approverName} — ${t.ownerDeclineReason}. Ticket closed, not proceeding.`,
    before, after: { status: "closed", ownerApprovalStatus: "declined", declineReason: t.ownerDeclineReason },
    notify: {
      type: "maintenance", title: "Owner declined",
      body: `Owner declined — ${t.ref}. Reason: ${t.ownerDeclineReason}`,
      /* PRIVACY: the reason is between Nexora and the owner. Owners and tenants
         never deal with each other in this model, and "the owner won't pay for it"
         reaching a tenant could genuinely damage the tenancy. Admin + owner only. */
      audiences: ["admin", "owner"],
    },
  });
  // Deliberately neutral: the owner's reason is between Nexora and the owner.
  pushNotify("maintenance", "Update on your maintenance request",
    "We are unable to proceed with this repair at present. Please contact us to discuss.",
    "ticket", id);
  return t;
}

/** Admin nudge to an owner sitting on a decision. */
export async function sendApprovalReminder(id: string, actor: string): Promise<{ ok: true }> {
  await mDelay(300);
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  const owner = ownerOf(t.propertyId);
  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "updated",
    summary: `Approval reminder sent to ${owner?.name ?? "owner"} for ${t.ref} by ${actor} (waiting ${waitingLabel(t)})`,
    after: { reminderSentAt: db.NOW_ISO },
    notify: { type: "maintenance", title: "Reminder sent", body: `Reminder sent to ${owner?.name ?? "the owner"} for ${t.ref}.` },
  });
  pushNotify("maintenance", "Reminder: maintenance approval required",
    `${pName(t.propertyId)}, ${uLabel(t.unitId)} — ${t.title}. Estimated ${money(t.assessedCost ?? 0)}. Awaiting your decision.`,
    "ticket", id, "updated", ["owner"]);
  return { ok: true };
}

/** Tenant paid their routed maintenance charge — work can now be scheduled. */
export async function markTenantPaidAndSchedule(id: string): Promise<MaintenanceTicket> {
  await mDelay(200);
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");
  if (t.status !== "awaiting_tenant_payment") return t;
  t.status = "scheduled";
  t.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `${t.ref} — tenant payment received, work may proceed`,
    after: { status: "scheduled" },
    notify: {
      type: "maintenance", title: "Payment received — work may proceed",
      body: `Payment received — work may proceed on ${t.ref}.`,
    },
  });
  if (t.assignee) {
    pushNotify("maintenance", "Work may proceed",
      `Payment received — work may proceed on ${t.ref}, ${uLabel(t.unitId)}.`, "ticket", id);
  }
  return t;
}
