/**
 * Additional work charges (F2.1).
 *
 * A worker finds something beyond the agreed scope. That work is NOT silently added
 * to the original booking and it is NOT billed hourly — hourly was considered at the
 * 27 Aug meeting and rejected. Instead it becomes its own record, linked to the
 * booking, which the customer approves and pays before the extra work proceeds.
 *
 * INVARIANT: the original booking and its accepted quotation are never mutated here.
 * That is what makes "the customer agreed to X" still true after the fact.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import type {
  AdditionalCharge, AdditionalChargeLine, AdditionalChargeStatus,
  CatalogueCurrency, Invoice,
} from "@/lib/mock/types";

const mDelay = (ms = 420) => new Promise((r) => setTimeout(r, ms));
const money = (n: number, c: CatalogueCurrency = "UGX") =>
  `${c} ${Math.round(n).toLocaleString("en-UG")}`;

export const CHARGE_STATUS_LABEL: Record<AdditionalChargeStatus, string> = {
  proposed: "Proposed",
  sent_to_customer: "Sent to customer",
  accepted: "Accepted",
  declined: "Declined",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

/* ------------------------------------------------------------------ reads */

export function chargesForBooking(bookingId: string): AdditionalCharge[] {
  return db.additionalCharges
    .filter((c) => c.bookingId === bookingId)
    .slice()
    .sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1));
}

/** Charges a customer still has to respond to or pay. */
export function openChargesForBooking(bookingId: string): AdditionalCharge[] {
  return chargesForBooking(bookingId).filter(
    (c) => c.status === "sent_to_customer" || c.status === "accepted" || c.status === "awaiting_payment",
  );
}

export function hasAdditionalCharges(bookingId: string): boolean {
  return db.additionalCharges.some((c) => c.bookingId === bookingId && c.status !== "cancelled");
}

/** Total additional value actually agreed (accepted or paid) on a booking. */
export function agreedAdditionalTotal(bookingId: string): number {
  return chargesForBooking(bookingId)
    .filter((c) => c.status === "accepted" || c.status === "awaiting_payment" || c.status === "paid")
    .reduce((s, c) => s + c.amount, 0);
}

export function chargeById(id: string): AdditionalCharge | undefined {
  return db.additionalCharges.find((c) => c.id === id);
}

/** Charges raised against any booking made by this tenant (customer approval view). */
export function chargesForTenant(tenantId: string): AdditionalCharge[] {
  const bookingIds = db.serviceBookings.filter((b) => b.customerId === tenantId).map((b) => b.id);
  return db.additionalCharges
    .filter((c) => bookingIds.includes(c.bookingId))
    .sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1));
}

/* ------------------------------------------------------------------ raise */

export interface RaiseChargeInput {
  bookingId: string;
  description: string;
  justification: string;
  items: AdditionalChargeLine[] | null;
  customAmount: number | null;
  customDescription: string | null;
  raisedBy: string;
}

export async function raiseAdditionalCharge(input: RaiseChargeInput): Promise<AdditionalCharge> {
  await mDelay();
  const booking = db.serviceBookings.find((b) => b.id === input.bookingId);
  if (!booking) throw new Error("Booking not found");

  const itemsTotal = (input.items ?? []).reduce((s, l) => s + l.lineTotal, 0);
  const amount = itemsTotal + (input.customAmount ?? 0);
  const seq = db.additionalCharges.filter((c) => c.bookingId === input.bookingId).length + 1;

  const charge: AdditionalCharge = {
    id: `adc_${Date.now()}`,
    reference: `${booking.reference}-AC${seq}`,
    bookingId: input.bookingId,
    description: input.description.trim(),
    justification: input.justification.trim(),
    items: input.items?.length ? input.items : null,
    customAmount: input.customAmount ?? null,
    customDescription: input.customDescription?.trim() || null,
    amount,
    currency: "UGX",
    raisedBy: input.raisedBy,
    raisedAt: db.NOW_ISO,
    status: "sent_to_customer",
    customerRespondedAt: null,
    declineReason: null,
    invoiceId: null,
    paidAt: null,
  };
  db.additionalCharges.unshift(charge);

  recordMutation({
    entityType: "additional_charge", entityId: charge.id, entityName: charge.reference, action: "created",
    summary: `Additional charge ${charge.reference} raised on ${booking.reference} — ${money(amount)} (${charge.description})`,
    after: { amount, status: charge.status, bookingRef: booking.reference },
    notify: {
      type: "system",
      title: "Additional charge raised",
      body: `${charge.reference} — ${money(amount)} on ${booking.reference}, awaiting customer approval.`,
    },
  });
  pushNotify(
    "payment",
    "Additional work required",
    `Additional work required on your ${booking.category} — ${money(amount)}. Please review and approve.`,
    "additional_charge",
    charge.id,
  );
  return charge;
}

/* --------------------------------------------------------- customer response */

export async function acceptAdditionalCharge(id: string): Promise<AdditionalCharge> {
  await mDelay();
  const charge = db.additionalCharges.find((c) => c.id === id);
  if (!charge) throw new Error("Charge not found");
  const booking = db.serviceBookings.find((b) => b.id === charge.bookingId);

  charge.status = "awaiting_payment";
  charge.customerRespondedAt = db.NOW_ISO;

  // Invoice numbered from the charge reference so the money traces straight back.
  const invoice: Invoice = {
    id: `inv_ac_${Date.now()}`,
    number: `INV-${charge.reference}`,
    leaseId: "",
    tenantId: booking?.customerId ?? "",
    propertyId: "",
    kind: "service",
    issued: db.NOW_ISO,
    due: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    amount: charge.amount,
    paid: 0,
    status: "pending",
    clientName: booking?.name,
    serviceBookingId: charge.bookingId,
  };
  db.invoices.unshift(invoice);
  charge.invoiceId = invoice.id;

  recordMutation({
    entityType: "additional_charge", entityId: id, entityName: charge.reference, action: "updated",
    summary: `Additional charge ${charge.reference} accepted by ${booking?.name ?? "customer"} — invoice ${invoice.number} for ${money(charge.amount)}`,
    before: { status: "sent_to_customer" },
    after: { status: charge.status, invoiceNumber: invoice.number },
    notify: {
      type: "payment",
      title: "Additional charge accepted",
      body: `Additional charge accepted — ${booking?.name ?? "customer"}, ${money(charge.amount)}. Invoice ${invoice.number} issued.`,
    },
  });
  return charge;
}

export async function declineAdditionalCharge(id: string, reason: string): Promise<AdditionalCharge> {
  await mDelay();
  const charge = db.additionalCharges.find((c) => c.id === id);
  if (!charge) throw new Error("Charge not found");
  const booking = db.serviceBookings.find((b) => b.id === charge.bookingId);

  charge.status = "declined";
  charge.declineReason = reason.trim();
  charge.customerRespondedAt = db.NOW_ISO;
  // The original booking is untouched — work continues at the ORIGINAL scope.

  recordMutation({
    entityType: "additional_charge", entityId: id, entityName: charge.reference, action: "updated",
    summary: `Additional charge ${charge.reference} declined — ${charge.declineReason}. Original scope continues unchanged.`,
    before: { status: "sent_to_customer" },
    after: { status: "declined", declineReason: charge.declineReason },
    notify: {
      type: "system",
      title: "Additional charge declined",
      body: `Additional charge declined — ${charge.declineReason}. Continue with the original scope only.`,
    },
  });
  // The assigned worker needs to know not to do the extra work.
  if (booking?.assignee) {
    pushNotify(
      "system",
      "Additional charge declined",
      `Additional charge declined — ${charge.declineReason}. Continue with the original scope only.`,
      "service-booking",
      charge.bookingId,
    );
  }
  return charge;
}

export async function cancelAdditionalCharge(id: string): Promise<AdditionalCharge> {
  await mDelay(250);
  const charge = db.additionalCharges.find((c) => c.id === id);
  if (!charge) throw new Error("Charge not found");
  charge.status = "cancelled";
  recordMutation({
    entityType: "additional_charge", entityId: id, entityName: charge.reference, action: "updated",
    summary: `Additional charge ${charge.reference} cancelled`,
    after: { status: "cancelled" },
    notify: false,
  });
  return charge;
}

/* ---------------------------------------------------------------- payment */

export interface ChargePaymentInput {
  method: string;
  reference: string;
  amount: number;
}

export async function payAdditionalCharge(id: string, input: ChargePaymentInput): Promise<AdditionalCharge> {
  await mDelay(600);
  const charge = db.additionalCharges.find((c) => c.id === id);
  if (!charge) throw new Error("Charge not found");
  const booking = db.serviceBookings.find((b) => b.id === charge.bookingId);

  charge.status = "paid";
  charge.paidAt = db.NOW_ISO;

  const invoice = db.invoices.find((i) => i.id === charge.invoiceId);
  if (invoice) { invoice.paid = input.amount; invoice.status = "paid"; }

  recordMutation({
    entityType: "additional_charge", entityId: id, entityName: charge.reference, action: "updated",
    summary: `Additional charge ${charge.reference} paid — ${money(input.amount)} via ${input.method} (${input.reference})`,
    before: { status: "awaiting_payment" },
    after: { status: "paid", amount: input.amount, reference: input.reference },
    notify: {
      type: "payment",
      title: "Additional charge paid",
      body: `${charge.reference} paid — ${money(input.amount)} from ${booking?.name ?? "customer"}.`,
    },
  });
  // The worker is the one waiting on this: they may now do the extra work.
  if (booking?.assignee) {
    pushNotify(
      "system",
      "Additional work approved and paid",
      `Additional work approved and paid — you may proceed. ${charge.description}`,
      "service-booking",
      charge.bookingId,
    );
  }
  return charge;
}

/** Additional-charge revenue actually collected, for the finance ledger. */
export function additionalChargeRevenue(): number {
  return db.additionalCharges.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
}
