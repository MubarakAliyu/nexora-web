/**
 * Service-booking financial lifecycle (E3).
 *
 * Pricing is ASSESSMENT-BASED by design — there is deliberately no rate card in
 * this file or anywhere else. A staff member visits, scopes the job and quotes it;
 * only then is an invoice raised, and work starts only once payment is confirmed:
 *
 *   assign → assess (scope + quote) → invoice → payment → start → complete → confirm
 *
 * Every mutation runs through `recordMutation` (store + audit + admin notification)
 * and adds client/staff notifications via `pushNotify`.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify, decrementStaffJobs } from "@/lib/api/admin-mutations";
import type { Invoice, ServiceBooking, ServiceBookingStatus } from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;
const dateShort = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const find = (id: string): ServiceBooking => {
  const sb = db.serviceBookings.find((s) => s.id === id);
  if (!sb) throw new Error("Service booking not found");
  return sb;
};

/* ------------------------------------------------------------ transitions */

export const SERVICE_STATUS_LABEL: Record<ServiceBookingStatus, string> = {
  new: "New",
  pending: "Pending",
  quote_accepted: "Quote Accepted",
  requires_quotation: "Requires Quotation",
  assigned: "Assigned",
  assessment_required: "Assessment Required",
  assessment_completed: "Assessed",
  invoice_generated: "Invoice Generated",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  in_progress: "In Progress",
  completed: "Completed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

/**
 * Which statuses may follow the current one. Prevents jumping straight from
 * `new` to `completed` — the money steps in between cannot be skipped.
 */
export const VALID_TRANSITIONS: Record<ServiceBookingStatus, ServiceBookingStatus[]> = {
  /* F1 — two entry paths now converge on the money steps:
   *   standardised  : pending → quote_accepted → awaiting_payment → paid → …
   *   non-standard  : requires_quotation → assessment_completed → quote_accepted → …
   * E3's assessment machinery is preserved for the second path. */
  new: ["quote_accepted", "requires_quotation", "assigned", "assessment_required", "cancelled"],
  pending: ["quote_accepted", "requires_quotation", "assigned", "assessment_required", "cancelled"],
  quote_accepted: ["invoice_generated", "awaiting_payment", "paid", "cancelled"],
  requires_quotation: ["assessment_completed", "assessment_required", "cancelled"],
  assigned: ["assessment_required", "assessment_completed", "cancelled"],
  assessment_required: ["assessment_completed", "cancelled"],
  assessment_completed: ["quote_accepted", "invoice_generated", "cancelled"],
  invoice_generated: ["awaiting_payment", "paid", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["assigned", "in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["confirmed", "in_progress"],
  confirmed: [],
  cancelled: [],
};

export function canTransition(from: ServiceBookingStatus, to: ServiceBookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Why a transition is blocked — surfaced as the disabled option's tooltip. */
export function transitionHint(from: ServiceBookingStatus, to: ServiceBookingStatus): string {
  if (canTransition(from, to)) return "";
  if (from === "confirmed") return "This job is confirmed and complete.";
  if (from === "cancelled") return "This booking was cancelled.";
  const order: ServiceBookingStatus[] = [
    "new", "assigned", "assessment_completed", "invoice_generated",
    "awaiting_payment", "paid", "in_progress", "completed", "confirmed",
  ];
  const need = order.indexOf(to) - order.indexOf(from);
  if (need > 1) return `Complete the steps before “${SERVICE_STATUS_LABEL[to]}” first — pricing comes from an assessment, and work starts only after payment.`;
  return `Cannot move from “${SERVICE_STATUS_LABEL[from]}” to “${SERVICE_STATUS_LABEL[to]}”.`;
}

/* ------------------------------------------------------------- assessment */

export interface AssessmentInput {
  assessedBy: string;
  assessedAt: string;
  scope: string;
  amount: number;
  notes?: string;
  photos?: string[];
}

export async function recordAssessment(id: string, input: AssessmentInput): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  const before = { status: sb.status, assessedAmount: sb.assessedAmount };
  sb.assessedBy = input.assessedBy;
  sb.assessedAt = new Date(input.assessedAt).toISOString();
  sb.assessmentScope = input.scope;
  sb.assessmentNotes = input.notes;
  sb.assessedAmount = input.amount;
  sb.assessmentPhotos = input.photos;
  sb.amount = input.amount;
  sb.status = "assessment_completed";
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "updated",
    summary: `Assessment recorded for ${sb.reference} — ${input.scope} · quoted ${money(input.amount)}`,
    before, after: { status: sb.status, assessedAmount: input.amount, scope: input.scope },
    notify: { type: "system", title: "Assessment completed", body: `${sb.category} for ${sb.name}, quoted ${money(input.amount)}` },
  });
  pushNotify("system", "Your service has been assessed", `Your ${sb.category.toLowerCase()} has been assessed. An invoice will follow shortly.`, "service-booking", id, "updated", ["tenant"]);
  return sb;
}

/* ---------------------------------------------------------------- invoice */

export interface ServiceInvoiceInput {
  amount: number;
  adjustmentReason?: string;
  dueDate: string;
  notes?: string;
}

export async function generateServiceInvoice(id: string, input: ServiceInvoiceInput): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  const number = sb.reference.replace("NX-SV-", "INV-SV-");
  const invoiceId = `inv_sv_${Date.now()}`;
  const tenant = db.tenants.find((t) => t.email === sb.email);
  const invoice: Invoice = {
    id: invoiceId,
    number,
    leaseId: "",
    tenantId: tenant?.id ?? "",
    propertyId: "",
    kind: "service",
    issued: db.NOW_ISO,
    due: new Date(input.dueDate).toISOString(),
    amount: input.amount,
    paid: 0,
    status: "pending",
    serviceBookingId: id,
    clientName: sb.name,
    dueDate: new Date(input.dueDate).toISOString(),
  };
  db.invoices.unshift(invoice);

  sb.invoiceId = invoiceId;
  sb.invoiceNumber = number;
  sb.invoiceAmount = input.amount;
  sb.invoiceAdjustmentReason = input.adjustmentReason;
  sb.invoiceDueDate = invoice.due;
  sb.invoiceGeneratedAt = db.NOW_ISO;
  sb.amount = input.amount;
  sb.paymentStatus = "awaiting_payment";
  sb.status = "awaiting_payment";

  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "created",
    summary: `Invoice ${number} generated for ${sb.reference} — ${money(input.amount)}${input.adjustmentReason ? ` (adjusted: ${input.adjustmentReason})` : ""}`,
    after: { invoiceNumber: number, amount: input.amount, due: invoice.due },
    notify: { type: "payment", title: "Service invoice generated", body: `${number} — ${money(input.amount)} for ${sb.name}` },
  });
  pushNotify("payment", "Your invoice is ready",
    `Your invoice for ${sb.category.toLowerCase()} is ready — ${money(input.amount)}. Payment is required before work begins. Reference ${number}.`,
    "service-booking", id, "updated", ["tenant"]);
  return sb;
}

/* ---------------------------------------------------------------- payment */

export interface ServicePaymentInput {
  amount: number;
  method: string;
  reference: string;
  date: string;
  notes?: string;
}

export async function recordServicePayment(id: string, input: ServicePaymentInput): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  const invoiceTotal = sb.invoiceAmount ?? sb.assessedAmount ?? 0;
  const paid = Math.min(input.amount, invoiceTotal);
  const totalPaid = (sb.paidAmount ?? 0) + paid;
  const full = totalPaid >= invoiceTotal;

  sb.paidAmount = totalPaid;
  sb.paymentMethod = input.method;
  sb.paymentReference = input.reference;
  sb.paidAt = new Date(input.date).toISOString();
  sb.paymentStatus = full ? "paid" : "partially_paid";
  if (full) sb.status = "paid";

  // Mirror onto the linked invoice so /admin/finance stays in step.
  const inv = db.invoices.find((i) => i.id === sb.invoiceId);
  if (inv) { inv.paid = totalPaid; inv.status = full ? "paid" : "partial"; }

  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "updated",
    summary: `Payment recorded for ${sb.reference} — ${money(paid)} via ${input.method} (${input.reference})${full ? "" : ` · balance ${money(invoiceTotal - totalPaid)}`}`,
    after: { paidAmount: totalPaid, method: input.method, reference: input.reference, full },
    notify: { type: "payment", title: "Service payment received", body: `${money(paid)} for ${sb.reference} — ${sb.name}` },
  });
  pushNotify("payment", "Payment received — thank you",
    full ? `Payment received — thank you. Your ${sb.category.toLowerCase()} will now be scheduled.`
         : `Part-payment of ${money(paid)} received. Balance outstanding: ${money(invoiceTotal - totalPaid)}.`,
    "service-booking", id, "updated", ["tenant"]);
  if (full && sb.assignee) {
    pushNotify("system", "Payment confirmed — you may proceed",
      `Payment confirmed for ${sb.reference} — you may proceed with the job.`, "service-booking", id, "updated", ["admin", "worker"]);
  }
  return sb;
}

/* ------------------------------------------------- work, completion, confirm */

export async function startServiceWork(id: string): Promise<ServiceBooking> {
  await mDelay(300);
  const sb = find(id);
  sb.status = "in_progress";
  sb.workStartedAt = db.NOW_ISO;
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "status_changed",
    summary: `Work started on ${sb.reference}`, after: { status: "in_progress" },
    notify: { type: "system", title: "Work started", body: `${sb.category} for ${sb.name} is now in progress.` },
  });
  pushNotify("system", "Work has started", `Work has started on your ${sb.category.toLowerCase()}.`, "service-booking", id, "updated", ["tenant"]);
  if (sb.assignee) pushNotify("system", "Job started", `${sb.reference} — ${sb.category} is now in progress.`, "service-booking", id, "updated", ["admin", "worker"]);
  return sb;
}

export async function markServiceCompleted(id: string, input: { notes: string; completedBy?: string; photos?: string[] }): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  sb.status = "completed";
  sb.completionNotes = input.notes;
  sb.completedBy = input.completedBy ?? sb.assignee;
  sb.completionPhotos = input.photos;
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "status_changed",
    summary: `${sb.completedBy ?? "Staff"} marked ${sb.reference} completed — ${input.notes}`,
    after: { status: "completed", completedBy: sb.completedBy },
    notify: { type: "system", title: "Awaiting your confirmation", body: `${sb.completedBy ?? "Staff"} marked ${sb.reference} as completed — awaiting your confirmation.` },
  });
  return sb;
}

export async function confirmServiceCompletion(id: string, confirmedBy: string): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  sb.status = "confirmed";
  sb.confirmedBy = confirmedBy;
  sb.confirmedAt = db.NOW_ISO;
  // E2 integration: the job is finally off the assignee's plate.
  decrementStaffJobs(sb.assignee);
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "status_changed",
    summary: `${confirmedBy} confirmed completion of ${sb.reference}`,
    after: { status: "confirmed", confirmedBy },
    notify: { type: "system", title: "Job confirmed", body: `${sb.reference} — ${sb.category} confirmed complete.` },
  });
  pushNotify("system", "Your service has been completed",
    `Your ${sb.category.toLowerCase()} has been completed. Thank you for choosing Nexora.`, "service-booking", id, "updated", ["tenant"]);
  if (sb.assignee) pushNotify("system", "Job confirmed", `Job confirmed — ${sb.reference}.`, "service-booking", id, "updated", ["admin", "worker"]);
  return sb;
}

export async function rejectServiceCompletion(id: string, reason: string): Promise<ServiceBooking> {
  await mDelay();
  const sb = find(id);
  sb.status = "in_progress";
  sb.rejectionReason = reason;
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "status_changed",
    summary: `Completion of ${sb.reference} rejected — ${reason}`,
    after: { status: "in_progress", rejectionReason: reason },
    notify: { type: "system", title: "Completion rejected", body: `${sb.reference} sent back to in progress — ${reason}` },
  });
  // Trim any trailing punctuation so the sentence doesn't end in a double period.
  const cleanReason = reason.trim().replace(/\.+$/, "");
  if (sb.assignee) pushNotify("system", "Completion rejected", `Completion rejected — ${cleanReason}. Please review.`, "service-booking", id, "updated", ["admin", "worker"]);
  return sb;
}

export async function cancelServiceBooking(id: string, reason: string): Promise<ServiceBooking> {
  await mDelay(300);
  const sb = find(id);
  const before = sb.status;
  sb.status = "cancelled";
  sb.rejectionReason = reason;
  decrementStaffJobs(sb.assignee);
  recordMutation({
    entityType: "service-booking", entityId: id, entityName: sb.reference, action: "status_changed",
    summary: `Service booking ${sb.reference} cancelled — ${reason}`,
    before: { status: before }, after: { status: "cancelled", reason },
    notify: { type: "system", title: "Service booking cancelled", body: `${sb.reference} — ${reason}` },
  });
  pushNotify("system", "Your booking was cancelled", `Your ${sb.category.toLowerCase()} booking was cancelled — ${reason}`, "service-booking", id, "updated", ["tenant"]);
  return sb;
}

/* ------------------------------------------------------------- reporting */

export interface ServiceRevenueSummary {
  totalInvoiced: number;
  totalCollected: number;
  awaitingPayment: number;
  jobsCompleted: number;
}

/** Revenue figures derived entirely from real bookings — never a price list. */
export function getServiceRevenueSummary(from?: string, to?: string): ServiceRevenueSummary {
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };
  const rows = db.serviceBookings;
  const totalInvoiced = rows
    .filter((s) => s.invoiceAmount != null && (!from && !to ? true : inRange(s.invoiceGeneratedAt)))
    .reduce((sum, s) => sum + (s.invoiceAmount ?? 0), 0);
  const totalCollected = rows
    .filter((s) => s.paidAmount != null && (!from && !to ? true : inRange(s.paidAt)))
    .reduce((sum, s) => sum + (s.paidAmount ?? 0), 0);
  const awaitingPayment = rows
    .filter((s) => s.paymentStatus === "awaiting_payment" || s.paymentStatus === "partially_paid")
    .reduce((sum, s) => sum + ((s.invoiceAmount ?? 0) - (s.paidAmount ?? 0)), 0);
  const jobsCompleted = rows.filter((s) => s.status === "completed" || s.status === "confirmed").length;
  return { totalInvoiced, totalCollected, awaitingPayment, jobsCompleted };
}

/** Total service revenue actually collected — feeds the Financial Overview. */
export function serviceRevenueCollected(): number {
  return db.serviceBookings.reduce((sum, s) => sum + (s.paidAmount ?? 0), 0);
}

export function dateOfShort(iso: string) { return dateShort(iso); }
