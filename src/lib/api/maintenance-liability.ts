/**
 * Maintenance cost liability (E4).
 *
 * Closing a ticket used to record a cost and stop there — "just numbers", as the
 * PM put it. Every closure now also records WHO PAYS, and the money follows one
 * of three branches:
 *
 *   owner  → property expense  → reduces that owner's settlement
 *   tenant → invoice raised    → tenant pays from their dashboard → Nexora revenue
 *   nexora → operational cost  → absorbed; neither party is charged
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import type {
  MaintenanceTicket, TicketLiability, Invoice, Expense,
} from "@/lib/mock/types";

const mDelay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;

const pName = (id: string) => db.properties.find((p) => p.id === id)?.name ?? "the property";
const uLabel = (id?: string) => db.units.find((u) => u.id === id)?.label ?? "the unit";
const tName = (id?: string) => db.tenants.find((t) => t.id === id)?.name ?? "the tenant";

export const LIABILITY_LABEL: Record<TicketLiability, string> = {
  owner: "Owner",
  tenant: "Tenant",
  nexora: "Nexora",
};

/** Marker used on the expense vendor so Nexora-absorbed costs never hit a settlement. */
export const NEXORA_OPERATIONAL = "Nexora Operational";

export interface CloseWithLiabilityInput {
  resolution: string;
  labourCost: number;
  materialsCost: number;
  liability: TicketLiability;
  liabilityReason: string;
  /** Only used when liability is 'tenant'. */
  invoiceDueDate?: string;
  /**
   * F3 — required when closure liability differs from what was routed after
   * assessment. The actual cause can turn out different from the estimate, but
   * the change has to be explained rather than silently applied.
   */
  liabilityChangeReason?: string;
}

/**
 * Close a ticket and route its cost. Extends the existing close flow — the
 * resolution + cost capture are unchanged, the liability decision is added.
 */
export async function closeTicketWithLiability(
  id: string,
  input: CloseWithLiabilityInput,
): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("Ticket not found");

  const total = (input.labourCost || 0) + (input.materialsCost || 0);
  const before = { status: t.status, cost: t.cost };

  t.status = "closed";
  t.resolution = input.resolution;
  t.labourCost = input.labourCost;
  t.materialsCost = input.materialsCost;
  t.cost = total;
  t.liability = input.liability;
  t.liabilityReason = input.liabilityReason;
  t.closedAt = db.NOW_ISO;
  t.updatedAt = db.NOW_ISO;

  /* F3 — actual vs assessed. Keeping both, and the gap between them, is what lets
     anyone later ask whether the estimate the owner approved was realistic. */
  t.actualCost = total;
  if (t.assessedCost != null) t.costVariance = total - t.assessedCost;
  if (t.chargeTo && t.chargeTo !== input.liability) {
    t.liabilityChangeReason = input.liabilityChangeReason?.trim() || null;
  }

  const property = pName(t.propertyId);
  const unit = uLabel(t.unitId);
  const tenant = tName(t.tenantId);

  if (input.liability === "owner") {
    /* ---- BRANCH A: the owner pays, via a property expense ---- */
    const expense: Expense = {
      id: `exp_mt_${Date.now()}`,
      propertyId: t.propertyId,
      category: "maintenance",
      vendor: t.assignee ?? "Maintenance",
      description: `${t.title} — ${unit}, ${property} (${t.ref})`,
      amount: total,
      date: db.NOW_ISO,
      status: "approved",
      maintenanceTicketId: t.id,
    };
    db.expenses.unshift(expense);
    t.expenseId = expense.id;
    t.paymentStatus = "not_applicable";

    recordMutation({
      entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
      summary: `Closed ${t.ref} — ${money(total)} charged to the owner (${input.liabilityReason})`,
      before, after: { liability: "owner", cost: total, expenseId: expense.id },
      notify: { type: "maintenance", title: "Ticket closed — owner expense", body: `${t.ref} closed. ${money(total)} recorded against ${property}.` },
    });
    pushNotify("maintenance", "Maintenance completed",
      `Maintenance completed at ${unit}, ${property} — ${t.title}. Cost of ${money(total)} has been recorded as a property expense and will be reflected in your next settlement.`,
      "ticket", id);
    pushNotify("maintenance", "Your request has been resolved",
      "Your maintenance request has been resolved at no cost to you.", "ticket", id);
    return t;
  }

  if (input.liability === "tenant") {
    /* ---- BRANCH B: the tenant pays, via an invoice ---- */
    const number = `INV-${t.ref}`; // TKT-0019 → INV-TKT-0019
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
      amount: total,
      paid: 0,
      status: "pending",
      maintenanceTicketId: t.id,
      clientName: tenantRec?.name,
    };
    db.invoices.unshift(invoice);
    t.invoiceId = invoice.id;
    t.invoiceNumber = number;
    t.invoiceAmount = total;
    t.invoiceDueDate = due;
    t.invoiceGeneratedAt = db.NOW_ISO;
    t.paymentStatus = "awaiting_payment";
    // The owner is NOT charged in this branch — no expense record is created.

    recordMutation({
      entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
      summary: `Closed ${t.ref} — ${money(total)} invoiced to ${tenant} as ${number} (${input.liabilityReason})`,
      before, after: { liability: "tenant", cost: total, invoiceNumber: number },
      notify: { type: "payment", title: "Maintenance invoice issued", body: `Maintenance invoice ${number} issued to ${tenant} — ${money(total)}` },
    });
    pushNotify("payment", "Maintenance charge",
      `Maintenance charge — ${t.title}. Amount due: ${money(total)}. Invoice ${number}. Please make payment from your dashboard.`,
      "ticket", id);
    return t;
  }

  /* ---- BRANCH C: Nexora absorbs it ---- */
  const expense: Expense = {
    id: `exp_nx_${Date.now()}`,
    /* ⚠️ propertyId IS DELIBERATELY EMPTY — DO NOT "FIX" THIS.
     *
     * Owner settlements deduct expenses by filtering on the owner's property IDs
     * (see agreements.ts → ownerExpenses, and settlement.ts → computeOwnerSettlement).
     * A Nexora-absorbed cost must never reach an owner, so we make that exclusion
     * STRUCTURAL rather than procedural: with no propertyId there is no filter any
     * present or future settlement calculation could match, so the cost cannot leak
     * into a payout even if someone forgets to special-case it.
     *
     * The originating property is still recoverable — it is named in `description`
     * and reachable via `maintenanceTicketId` — it just isn't a settlement key.
     */
    propertyId: "",
    category: "admin",
    vendor: NEXORA_OPERATIONAL,
    description: `${t.title} — ${unit}, ${property} (${t.ref})`,
    amount: total,
    date: db.NOW_ISO,
    status: "approved",
    maintenanceTicketId: t.id,
  };
  db.expenses.unshift(expense);
  t.expenseId = expense.id;
  t.paymentStatus = "not_applicable";

  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `Closed ${t.ref} — ${money(total)} absorbed by Nexora (${input.liabilityReason})`,
    before, after: { liability: "nexora", cost: total, expenseId: expense.id },
    notify: { type: "maintenance", title: "Cost absorbed by Nexora", body: `Maintenance cost of ${money(total)} absorbed by Nexora — ${input.liabilityReason}` },
  });
  pushNotify("maintenance", "Your request has been resolved",
    "Your maintenance request has been resolved at no cost to you.", "ticket", id);
  return t;
}

/* ------------------------------------------------------------- payment */

export interface MaintenancePaymentInput {
  amount: number;
  method: string;
  reference: string;
  date?: string;
}

/** Settle a tenant maintenance charge (tenant portal, or admin taking cash). */
export async function payMaintenanceCharge(
  ticketId: string,
  input: MaintenancePaymentInput,
): Promise<MaintenanceTicket> {
  await mDelay(600);
  const t = db.tickets.find((x) => x.id === ticketId);
  if (!t) throw new Error("Ticket not found");
  const paidAt = input.date ? new Date(input.date).toISOString() : db.NOW_ISO;

  t.paidAmount = input.amount;
  t.paymentMethod = input.method;
  t.paymentReference = input.reference;
  t.paidAt = paidAt;
  t.paymentStatus = "paid";

  const invoice = db.invoices.find((i) => i.id === t.invoiceId);
  if (invoice) { invoice.paid = input.amount; invoice.status = "paid"; }

  const tenant = tName(t.tenantId);
  recordMutation({
    entityType: "ticket", entityId: ticketId, entityName: t.ref, action: "updated",
    summary: `Maintenance charge paid — ${t.ref}, ${money(input.amount)} via ${input.method} (${input.reference})`,
    after: { paidAmount: input.amount, method: input.method, reference: input.reference },
    notify: { type: "payment", title: "Maintenance payment received", body: `Maintenance payment received — ${tenant}, ${money(input.amount)}, ticket ${t.ref}` },
  });
  pushNotify("payment", "Payment confirmed",
    `Your maintenance payment of ${money(input.amount)} for ${t.title} was received. Reference ${input.reference}.`,
    "ticket", ticketId);
  return t;
}

/* ------------------------------------------------------------ queries */

/** Unpaid maintenance charges for a tenant (drives the dashboard alert). */
export function tenantMaintenanceCharges(tenantId: string): MaintenanceTicket[] {
  return db.tickets.filter(
    (t) => t.tenantId === tenantId && t.liability === "tenant" && t.paymentStatus === "awaiting_payment",
  );
}

/** Every maintenance charge for a tenant, paid or not (payments/documents pages). */
export function tenantMaintenanceInvoices(tenantId: string): MaintenanceTicket[] {
  return db.tickets.filter((t) => t.tenantId === tenantId && t.liability === "tenant" && !!t.invoiceNumber);
}

export interface MaintenanceSummary {
  totalCost: number;
  owner: { amount: number; count: number };
  tenant: { amount: number; count: number; awaiting: number };
  nexora: { amount: number; count: number };
}

/** Liability split across tickets, optionally within a date range. */
export function getMaintenanceSummary(from?: string, to?: string): MaintenanceSummary {
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };
  const rows = db.tickets.filter((t) => t.liability && t.cost && (!from && !to ? true : inRange(t.closedAt ?? t.updatedAt)));
  const sum = (l: TicketLiability) => rows.filter((t) => t.liability === l).reduce((s, t) => s + (t.cost ?? 0), 0);
  const count = (l: TicketLiability) => rows.filter((t) => t.liability === l).length;
  return {
    totalCost: rows.reduce((s, t) => s + (t.cost ?? 0), 0),
    owner: { amount: sum("owner"), count: count("owner") },
    tenant: {
      amount: sum("tenant"),
      count: count("tenant"),
      awaiting: rows.filter((t) => t.liability === "tenant" && t.paymentStatus === "awaiting_payment").length,
    },
    nexora: { amount: sum("nexora"), count: count("nexora") },
  };
}

/** Total maintenance revenue actually collected from tenants. */
export function maintenanceRevenueCollected(): number {
  return db.tickets
    .filter((t) => t.liability === "tenant" && t.paymentStatus === "paid")
    .reduce((s, t) => s + (t.paidAmount ?? 0), 0);
}
