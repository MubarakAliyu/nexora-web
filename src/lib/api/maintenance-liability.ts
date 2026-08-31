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
import { activeCurrency } from "@/lib/stores/preferences";
import { formatCurrencyFull } from "@/lib/format";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import type {
  MaintenanceTicket, TicketLiability, Invoice, Expense,
  Currency,
} from "@/lib/mock/types";

const mDelay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
/** F5 — delegates to THE formatter. Currency defaults to the record's own. */
const money = (n: number, c: Currency = "UGX") => formatCurrencyFull(n, c);

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
      currency: activeCurrency(),
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
      "ticket", id, "updated", ["owner"]);
    pushNotify("maintenance", "Your request has been resolved",
      "Your maintenance request has been resolved at no cost to you.", "ticket", id, "updated", ["tenant"]);
    return t;
  }

  if (input.liability === "tenant") {
    /* ---- BRANCH B: the tenant pays, via an invoice ---- */
    const number = `INV-${t.ref}`; // TKT-0019 → INV-TKT-0019
    const due = input.invoiceDueDate
      ? new Date(input.invoiceDueDate).toISOString()
      : new Date(Date.now() + 14 * 86_400_000).toISOString();
    const tenantRec = db.tenants.find((x) => x.id === t.tenantId);

    /* F3 — under E4 this branch was the FIRST time a tenant was invoiced, so it
       could safely raise one. F3 moved that forward to routing, and the tenant's
       payment is what releases the work — so by the time we get here the invoice
       usually exists and is usually already PAID.
       Re-issuing it billed the tenant a second time for the same repair, reset
       `paymentStatus` off "paid", and so erased real collected money from
       Maintenance Revenue. Reconcile against the existing invoice instead. */
    const existing = t.invoiceId ? db.invoices.find((i) => i.id === t.invoiceId) : undefined;
    if (existing) {
      const variance = total - existing.amount;
      existing.amount = total;
      existing.status = existing.paid >= total ? "paid" : "pending";
      t.invoiceAmount = total;
      t.paymentStatus = existing.paid >= total ? "paid" : "awaiting_payment";
      const settled = existing.paid >= total;

      recordMutation({
        entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
        summary: settled
          ? `Closed ${t.ref} — ${money(total)} already paid by ${tenant} on ${number}${variance ? `, estimate adjusted by ${money(variance)}` : ""} (${input.liabilityReason})`
          : `Closed ${t.ref} — ${money(total - existing.paid)} still outstanding from ${tenant} on ${number} (${input.liabilityReason})`,
        before, after: { liability: "tenant", cost: total, invoiceNumber: number, paid: existing.paid },
        notify: {
          type: "payment", title: "Ticket closed — tenant charge",
          body: settled
            ? `${t.ref} closed. ${money(total)} collected from ${tenant} on ${number}.`
            : `${t.ref} closed. ${money(total - existing.paid)} still due from ${tenant} on ${number}.`,
          audiences: ["admin"],
        },
      });
      // Only chase them if something is actually still owed.
      if (!settled) {
        pushNotify("payment", "Maintenance charge",
          `Maintenance charge — ${t.title}. Amount due: ${money(total - existing.paid)}. Invoice ${number}.`,
          "ticket", id, "updated", ["tenant"]);
      } else {
        pushNotify("maintenance", "Your maintenance request has been resolved",
          `${t.title} is complete. Your payment of ${money(existing.paid)} on ${number} covers it in full.`,
          "ticket", id, "updated", ["tenant"]);
      }
      return t;
    }

    const invoice: Invoice = {
      // F5 — stamped with the currency it is being created in.
      currency: activeCurrency(),
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
      "ticket", id, "updated", ["tenant"]);
    return t;
  }

  /* ---- BRANCH C: Nexora absorbs it ---- */
  const expense: Expense = {
    currency: activeCurrency(),
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
    "Your maintenance request has been resolved at no cost to you.", "ticket", id, "updated", ["tenant"]);
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

  /* F3 — payment is the gate that releases the work. Without this the ticket sat
     in awaiting_tenant_payment forever and nobody was told they could start. */
  const releasedForWork = t.status === "awaiting_tenant_payment";
  if (releasedForWork) t.status = "scheduled";

  const tenant = tName(t.tenantId);
  recordMutation({
    entityType: "ticket", entityId: ticketId, entityName: t.ref, action: "updated",
    summary: `Maintenance charge paid — ${t.ref}, ${money(input.amount)} via ${input.method} (${input.reference})${releasedForWork ? " — work may now proceed" : ""}`,
    after: { paidAmount: input.amount, method: input.method, reference: input.reference },
    notify: { type: "payment", title: "Maintenance payment received", body: `Maintenance payment received — ${tenant}, ${money(input.amount)}, ticket ${t.ref}` },
  });
  pushNotify("payment", "Payment confirmed",
    `Your maintenance payment of ${money(input.amount)} for ${t.title} was received. Reference ${input.reference}.`,
    "ticket", ticketId, "updated", ["tenant"]);
  if (releasedForWork) {
    // Admin and the assigned technician both need to know work is unblocked.
    pushNotify("maintenance", "Payment received — work may proceed",
      `Payment received — work may proceed on ${t.ref}, ${uLabel(t.unitId)}.`, "ticket", ticketId, "updated", ["admin", "worker"], t.assigneeId);
  }
  return t;
}

/* ------------------------------------------------------------ queries */

/**
 * Is this ticket billed to the tenant?
 *
 * E4 recorded that as `liability` at closure. F3 moved the decision earlier, to
 * `chargeTo` at routing — so an open ticket routed to the tenant has an invoice and
 * a `chargeTo` but no `liability` yet. Checking both is what stops a live invoice
 * being invisible to the person who has to pay it.
 */
export const billedToTenant = (t: MaintenanceTicket) =>
  t.liability === "tenant" || (!t.liability && t.chargeTo === "tenant");

/** Unpaid maintenance charges for a tenant (drives the dashboard alert). */
export function tenantMaintenanceCharges(tenantId: string): MaintenanceTicket[] {
  return db.tickets.filter(
    (t) => t.tenantId === tenantId && billedToTenant(t) && t.paymentStatus === "awaiting_payment",
  );
}

/** Every maintenance charge for a tenant, paid or not (payments/documents pages). */
export function tenantMaintenanceInvoices(tenantId: string): MaintenanceTicket[] {
  return db.tickets.filter((t) => t.tenantId === tenantId && billedToTenant(t) && !!t.invoiceNumber);
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
  /* F3 — a ticket routed but not yet closed is a committed cost: it has a payer
     (`chargeTo`) and an estimate (`assessedCost`) even though `liability` and `cost`
     only arrive at closure. Counting only closed tickets made the awaiting-payment
     figure impossible to reach. */
  const payer = (t: MaintenanceTicket) => t.liability ?? t.chargeTo ?? null;
  const amountOf = (t: MaintenanceTicket) => t.cost ?? t.assessedCost ?? 0;
  const rows = db.tickets.filter(
    (t) => payer(t) && amountOf(t) > 0 && (!from && !to ? true : inRange(t.closedAt ?? t.updatedAt)),
  );
  const sum = (l: TicketLiability) => rows.filter((t) => payer(t) === l).reduce((s, t) => s + amountOf(t), 0);
  const count = (l: TicketLiability) => rows.filter((t) => payer(t) === l).length;
  return {
    totalCost: rows.reduce((s, t) => s + amountOf(t), 0),
    owner: { amount: sum("owner"), count: count("owner") },
    tenant: {
      amount: sum("tenant"),
      count: count("tenant"),
      awaiting: rows.filter((t) => billedToTenant(t) && t.paymentStatus === "awaiting_payment").length,
    },
    nexora: { amount: sum("nexora"), count: count("nexora") },
  };
}

/** Total maintenance revenue actually collected from tenants. */
export function maintenanceRevenueCollected(): number {
  return db.tickets
    .filter((t) => billedToTenant(t) && t.paymentStatus === "paid")
    .reduce((s, t) => s + (t.paidAmount ?? 0), 0);
}
