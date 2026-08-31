/**
 * A worker's own jobs (F4.3).
 *
 * Service bookings and maintenance tickets are different records with different
 * lifecycles, but to a field worker they are one list: "what am I doing today".
 * `WorkerJob` is that unified view — a projection, not a new store. Nothing here
 * duplicates the E3/F1 or F3 flows: accept/decline is new, and start/complete
 * delegate to the existing lifecycle functions so the manager confirmation step
 * survives untouched.
 */
import * as db from "@/lib/mock/db";
import { activeCurrency } from "@/lib/stores/preferences";
import { formatCurrencyFull } from "@/lib/format";
import { recordMutation } from "@/lib/api/actions";
import { isAssignedTo } from "@/lib/api/worker";
import { startServiceWork, markServiceCompleted } from "@/lib/api/service-lifecycle";
import { quotationForBooking } from "@/lib/api/catalogue";
import type {
  Staff, ServiceBooking, MaintenanceTicket, WorkerJobResponse, Quotation, WorkerPayout,
  Currency,
} from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
/** F5 — delegates to THE formatter. Currency defaults to the record's own. */
const money = (n: number, c: Currency = "UGX") => formatCurrencyFull(n, c);

export type WorkerJobKind = "service" | "maintenance";

/** What the worker can currently do — derived, never stored. */
export type WorkerJobStage =
  | "assigned"      // awaiting their accept/decline
  | "accepted"      // theirs, not started
  | "in_progress"
  | "completed"     // done, awaiting manager confirmation
  | "confirmed"
  | "declined"
  | "cancelled";

export interface WorkerJob {
  id: string;
  kind: WorkerJobKind;
  reference: string;
  title: string;
  /** Service type or maintenance category, for the icon and heading. */
  category: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  scheduledAt: string | null;
  stage: WorkerJobStage;
  /** Underlying record status, shown as the fine print. */
  rawStatus: string;
  declineReason: string | null;
  /** Service bookings only — the F1 quotation the customer agreed to. */
  quotation: Quotation | null;
  /** Maintenance only — what the assessment found and what was approved. */
  assessmentNotes: string | null;
  approvedCost: number | null;
  description: string;
  specialRequests: string | null;
}

/* ------------------------------------------------------------ projection */

const propertyAddress = (propertyId?: string) => {
  const p = db.properties.find((x) => x.id === propertyId);
  return p ? `${p.name}${p.location ? `, ${p.location}` : ""}` : "Address on file";
};

function serviceStage(sb: ServiceBooking): WorkerJobStage {
  if (sb.status === "cancelled") return "cancelled";
  if (sb.workerResponse === "declined") return "declined";
  if (sb.status === "confirmed") return "confirmed";
  if (sb.status === "completed") return "completed";
  if (sb.status === "in_progress") return "in_progress";
  // Everything earlier is "assigned to me" until I accept it.
  return sb.workerResponse === "accepted" ? "accepted" : "assigned";
}

function ticketStage(t: MaintenanceTicket): WorkerJobStage {
  if (t.workerResponse === "declined") return "declined";
  if (t.status === "closed") return "confirmed";
  if (t.status === "completed") return "completed";
  if (t.status === "in_progress") return "in_progress";
  return t.workerResponse === "accepted" ? "accepted" : "assigned";
}

function fromBooking(sb: ServiceBooking): WorkerJob {
  return {
    id: sb.id,
    kind: "service",
    reference: sb.reference,
    title: sb.category,
    category: sb.category,
    customerName: sb.name,
    customerPhone: sb.phone ?? null,
    address: sb.location ?? "Address on file",
    scheduledAt: sb.date ?? null,
    stage: serviceStage(sb),
    rawStatus: sb.status,
    declineReason: sb.workerDeclineReason ?? null,
    quotation: quotationForBooking(sb.id) ?? null,
    assessmentNotes: null,
    approvedCost: sb.amount ?? null,
    description: sb.details ?? "",
    specialRequests: sb.details ?? null,
  };
}

function fromTicket(t: MaintenanceTicket): WorkerJob {
  const unit = db.units.find((u) => u.id === t.unitId);
  const tenant = db.tenants.find((x) => x.id === t.tenantId);
  return {
    id: t.id,
    kind: "maintenance",
    reference: t.ref,
    title: t.title,
    category: t.category,
    customerName: tenant?.name ?? "Tenant",
    customerPhone: tenant?.phone ?? null,
    address: `${propertyAddress(t.propertyId)}${unit ? ` — ${unit.label}` : ""}`,
    scheduledAt: t.updatedAt ?? null,
    stage: ticketStage(t),
    rawStatus: t.status,
    declineReason: t.workerDeclineReason ?? null,
    quotation: null,
    assessmentNotes: t.assessmentNotes ?? null,
    approvedCost: t.assessedCost ?? null,
    description: t.description,
    specialRequests: null,
  };
}

/* ----------------------------------------------------------------- reads */

/**
 * Every job assigned to this worker, newest first.
 *
 * NOTE the `isAssignedTo` call rather than a bare `assigneeId ===`. Admin lists
 * never filtered by worker at all, so nothing previously depended on E2-era rows
 * that carry only the display name. A worker's list does.
 */
export function jobsForWorker(member: Staff | undefined): WorkerJob[] {
  if (!member) return [];
  const services = db.serviceBookings.filter((sb) => isAssignedTo(sb, member)).map(fromBooking);
  const tickets = db.tickets.filter((t) => isAssignedTo(t, member)).map(fromTicket);
  return [...services, ...tickets].sort((a, b) => {
    const av = a.scheduledAt ?? "";
    const bv = b.scheduledAt ?? "";
    return av < bv ? 1 : av > bv ? -1 : 0;
  });
}

export function jobById(member: Staff | undefined, id: string): WorkerJob | undefined {
  return jobsForWorker(member).find((j) => j.id === id);
}

const sameDay = (iso: string | null, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear()
    && d.getUTCMonth() === ref.getUTCMonth()
    && d.getUTCDate() === ref.getUTCDate();
};

export const OPEN_STAGES: WorkerJobStage[] = ["assigned", "accepted", "in_progress"];

export function jobsToday(member: Staff | undefined): WorkerJob[] {
  const today = new Date(db.NOW_ISO);
  return jobsForWorker(member).filter((j) => OPEN_STAGES.includes(j.stage) && sameDay(j.scheduledAt, today));
}

/**
 * The next few jobs AFTER today.
 *
 * Note the `>= db.NOW_ISO` — without it "Next up" happily listed jobs dated
 * months in the past, because "not today and still open" is true of anything
 * overdue. A worker reading "Next up" needs what is coming, not what slipped.
 */
export function jobsUpcoming(member: Staff | undefined, limit = 3): WorkerJob[] {
  const today = new Date(db.NOW_ISO);
  return jobsForWorker(member)
    .filter((j) =>
      OPEN_STAGES.includes(j.stage)
      && !sameDay(j.scheduledAt, today)
      && !!j.scheduledAt
      && j.scheduledAt >= db.NOW_ISO)
    .sort((a, b) => ((a.scheduledAt ?? "") < (b.scheduledAt ?? "") ? -1 : 1))
    .slice(0, limit);
}

/** Open jobs whose scheduled date has already passed. */
export function jobsOverdue(member: Staff | undefined): WorkerJob[] {
  const today = new Date(db.NOW_ISO);
  return jobsForWorker(member).filter(
    (j) => OPEN_STAGES.includes(j.stage) && !!j.scheduledAt
      && j.scheduledAt < db.NOW_ISO && !sameDay(j.scheduledAt, today),
  );
}

export interface WorkerStats {
  jobsToday: number;
  completedThisWeek: number;
  earningsThisMonth: number;
}

export function workerStats(member: Staff | undefined): WorkerStats {
  if (!member) return { jobsToday: 0, completedThisWeek: 0, earningsThisMonth: 0 };
  const now = new Date(db.NOW_ISO);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const done = jobsForWorker(member).filter(
    (j) => (j.stage === "completed" || j.stage === "confirmed") && (j.scheduledAt ?? "") >= weekAgo,
  );
  const earned = db.workerEarnings
    .filter((e) => e.staffId === member.id && e.earnedAt >= monthStart)
    .reduce((s, e) => s + e.amount, 0);
  return { jobsToday: jobsToday(member).length, completedThisWeek: done.length, earningsThisMonth: earned };
}

/* ------------------------------------------------------- accept / decline */

function locate(id: string): { booking?: ServiceBooking; ticket?: MaintenanceTicket } {
  const booking = db.serviceBookings.find((b) => b.id === id);
  if (booking) return { booking };
  return { ticket: db.tickets.find((t) => t.id === id) };
}

function setResponse(
  target: ServiceBooking | MaintenanceTicket,
  response: WorkerJobResponse,
  reason?: string,
) {
  target.workerResponse = response;
  target.workerRespondedAt = db.NOW_ISO;
  target.workerDeclineReason = response === "declined" ? (reason ?? null) : null;
}

export async function acceptJob(id: string, member: Staff): Promise<void> {
  await mDelay(300);
  const { booking, ticket } = locate(id);
  const target = booking ?? ticket;
  if (!target) throw new Error("Job not found");
  const ref = booking ? booking.reference : ticket!.ref;
  setResponse(target, "accepted");

  recordMutation({
    entityType: booking ? "service_booking" : "ticket", entityId: id, entityName: ref, action: "updated",
    summary: `${member.name} accepted ${ref}`,
    before: { workerResponse: "pending" }, after: { workerResponse: "accepted" },
    notify: {
      type: "system", title: "Job accepted",
      body: `${member.name} accepted ${ref}.`,
      audiences: ["admin"],
    },
  });
}

export async function declineJob(id: string, member: Staff, reason: string): Promise<void> {
  await mDelay(300);
  const { booking, ticket } = locate(id);
  const target = booking ?? ticket;
  if (!target) throw new Error("Job not found");
  const ref = booking ? booking.reference : ticket!.ref;
  const clean = reason.trim();
  setResponse(target, "declined", clean);

  /* Declining RELEASES the assignment — the job goes back to the pool for an
     admin to reassign, and the worker's job counter comes down with it. */
  if (booking) { booking.assigneeId = undefined; booking.assignee = undefined; }
  if (ticket) { ticket.assigneeId = undefined; ticket.assignee = undefined; }
  member.assignedJobs = Math.max(0, (member.assignedJobs ?? 0) - 1);

  recordMutation({
    entityType: booking ? "service_booking" : "ticket", entityId: id, entityName: ref, action: "updated",
    summary: `${member.name} declined ${ref} — ${clean.replace(/[.\s]+$/, "")}. Assignment released for reassignment.`,
    before: { assignee: member.name, workerResponse: "pending" },
    after: { assignee: null, workerResponse: "declined", reason: clean },
    notify: {
      type: "system", title: "Job declined — needs reassignment",
      body: `${member.name} declined ${ref} — ${clean.replace(/[.\s]+$/, "")}. The job is unassigned and needs reallocating.`,
      audiences: ["admin"],
    },
  });
}

/* --------------------------------------------------------- start / finish */

export async function startJob(id: string, member: Staff): Promise<void> {
  const { booking, ticket } = locate(id);
  if (booking) {
    // Reuse the E3 lifecycle so the customer-facing flow is identical.
    await startServiceWork(id);
    return;
  }
  if (!ticket) throw new Error("Job not found");
  await mDelay(300);
  const before = { status: ticket.status };
  ticket.status = "in_progress";
  ticket.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket", entityId: id, entityName: ticket.ref, action: "status_changed",
    summary: `${member.name} started work on ${ticket.ref}`,
    before, after: { status: "in_progress" },
    notify: {
      type: "maintenance", title: "Work started",
      body: `${member.name} started work on ${ticket.ref}.`,
      audiences: ["admin"],
    },
  });
}

export interface CompletionInput {
  workDone: string;
  notes?: string;
  /** Photo upload is stubbed until file storage is wired in. */
  photos?: string[];
}

export async function completeJob(id: string, member: Staff, input: CompletionInput): Promise<void> {
  const { booking, ticket } = locate(id);
  if (booking) {
    /* E3/F1 — the worker COMPLETES, the manager CONFIRMS. This deliberately
       calls the same function the admin path uses, so the confirmation step
       still stands between "worker says done" and "customer told done". */
    await markServiceCompleted(id, {
      notes: [input.workDone, input.notes].filter(Boolean).join(" — "),
      completedBy: member.name,
      photos: input.photos,
    });
    return;
  }
  if (!ticket) throw new Error("Job not found");
  await mDelay(400);
  const before = { status: ticket.status };
  ticket.status = "completed";
  ticket.resolution = input.workDone.trim();
  ticket.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket", entityId: id, entityName: ticket.ref, action: "status_changed",
    summary: `${member.name} marked ${ticket.ref} complete — ${ticket.resolution}. Awaiting manager confirmation.`,
    before, after: { status: "completed", resolution: ticket.resolution },
    notify: {
      type: "maintenance", title: "Job completed — confirmation needed",
      body: `${member.name} completed ${ticket.ref}. Review and close it to confirm.`,
      audiences: ["admin"],
    },
  });
}

/* -------------------------------------------------------------- earnings */

export interface EarningsSummary {
  earnedThisMonth: number;
  pendingPayout: number;
  totalPaid: number;
}

export function earningsFor(member: Staff | undefined) {
  if (!member) return [];
  return db.workerEarnings.filter((e) => e.staffId === member.id)
    .slice().sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : -1));
}

export function payoutsFor(member: Staff | undefined): WorkerPayout[] {
  if (!member) return [];
  return db.workerPayouts.filter((p) => p.staffId === member.id)
    .slice().sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

export function earningsSummary(member: Staff | undefined): EarningsSummary {
  if (!member) return { earnedThisMonth: 0, pendingPayout: 0, totalPaid: 0 };
  const now = new Date(db.NOW_ISO);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const mine = earningsFor(member);
  return {
    earnedThisMonth: mine.filter((e) => e.earnedAt >= monthStart).reduce((s, e) => s + e.amount, 0),
    // Unsettled earnings, minus anything already sitting in a requested payout.
    pendingPayout: availableBalance(member),
    totalPaid: payoutsFor(member).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
  };
}

/** Earned but not yet attached to any payout, and not already requested. */
export function availableBalance(member: Staff | undefined): number {
  if (!member) return 0;
  const unsettled = earningsFor(member).filter((e) => !e.payoutId).reduce((s, e) => s + e.amount, 0);
  const requested = payoutsFor(member)
    .filter((p) => p.status === "requested" || p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  return Math.max(0, unsettled - requested);
}

/** Contractors invoice; employees are on payroll and do not request payouts. */
export function canRequestPayout(member: Staff | undefined): boolean {
  return member?.workerType === "contractor" && availableBalance(member) > 0;
}

export async function requestPayout(
  member: Staff,
  amount: number,
  methodNote: string,
): Promise<WorkerPayout> {
  await mDelay();
  const available = availableBalance(member);
  if (amount <= 0 || amount > available) throw new Error("Amount exceeds the available balance");

  const payout: WorkerPayout = {
    // F5 — stamped with the currency it is being created in.
    currency: activeCurrency(),
    id: `wpo_${Date.now()}`,
    reference: `NX-PO-${Math.floor(1000 + Math.random() * 9000)}`,
    staffId: member.id,
    amount: Math.round(amount),
    status: "requested",
    requestedAt: db.NOW_ISO,
    processedAt: null,
    methodNote: methodNote.trim() || null,
    rejectionReason: null,
  };
  db.workerPayouts.unshift(payout);

  recordMutation({
    entityType: "payout", entityId: payout.id, entityName: payout.reference, action: "created",
    summary: `${member.name} requested a payout of ${money(payout.amount)} (${payout.reference})${payout.methodNote ? ` via ${payout.methodNote}` : ""}`,
    after: { amount: payout.amount, status: payout.status },
    notify: {
      type: "payment", title: "Payout requested",
      body: `${member.name} requested a payout of ${money(payout.amount)} — ${payout.reference}.`,
      audiences: ["admin"],
    },
  });
  return payout;
}
