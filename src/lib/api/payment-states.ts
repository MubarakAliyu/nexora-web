/**
 * Payment states (F2.2).
 *
 * ⚠️ The FRONTEND REPRESENTS provider states. The BACKEND owns initialization,
 * verification, webhook handling and reconciliation. Nothing here talks to a
 * gateway — this is the state model the UI renders and the admin acts on, so that
 * when a real provider is wired in the screens already exist for every outcome it
 * can report.
 *
 * The key rule the UI must honour: only `successful` marks an invoice paid.
 * `pending` and `requires_verification` deliberately leave it unpaid, because
 * money that has not been confirmed is not money.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import type { Payment, PaymentState } from "@/lib/mock/types";

const mDelay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;

export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  pending: "Pending",
  successful: "Successful",
  failed: "Failed",
  cancelled: "Cancelled",
  requires_verification: "Requires verification",
};

/** What the customer is told, per state. */
export const PAYMENT_STATE_MESSAGE: Record<PaymentState, string> = {
  pending: "Awaiting confirmation from payment provider",
  successful: "Payment confirmed — your receipt is available below.",
  failed: "The payment was not completed.",
  cancelled: "You cancelled this payment. Nothing has been charged.",
  requires_verification: "Payment received — awaiting verification. Your invoice stays open until our team confirms it.",
};

/** Palette-only styling; no raw red/green. */
export const PAYMENT_STATE_STYLE: Record<PaymentState, string> = {
  pending: "border-accent/40 bg-surface-active text-foreground",
  successful: "border-primary/30 bg-primary/10 text-primary",
  failed: "border-primary/40 bg-primary/5 text-primary",
  cancelled: "border-transparent bg-surface-hover text-muted",
  requires_verification: "border-accent/40 bg-surface-active text-foreground",
};

/** Only a confirmed payment settles an invoice. */
export const isSettling = (state: PaymentState) => state === "successful";

/** The coarse status the rest of the app already reads, derived from the state. */
export function statusForState(state: PaymentState): Payment["status"] {
  if (state === "successful") return "completed";
  if (state === "failed" || state === "cancelled") return "failed";
  return "pending";
}

export function paymentState(p: Payment): PaymentState {
  if (p.state) return p.state;
  // Records written before F2 carry only the coarse status.
  return p.status === "completed" ? "successful" : p.status === "failed" ? "failed" : "pending";
}

export function paymentsInState(state: PaymentState): Payment[] {
  return db.payments.filter((p) => paymentState(p) === state);
}

export function verificationQueue(): Payment[] {
  return paymentsInState("requires_verification");
}

/* ------------------------------------------------------------ transitions */

function tenantName(id: string) {
  return db.tenants.find((t) => t.id === id)?.name ?? "the customer";
}

/** Admin confirms a manually-verified payment. Settles the invoice. */
export async function verifyPayment(paymentId: string): Promise<Payment> {
  await mDelay();
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p) throw new Error("Payment not found");
  const before = { state: paymentState(p), status: p.status };

  p.state = "successful";
  p.status = "completed";
  p.stateChangedAt = db.NOW_ISO;

  const invoice = db.invoices.find((i) => i.id === p.invoiceId);
  if (invoice) { invoice.paid = p.amount; invoice.status = "paid"; }

  recordMutation({
    entityType: "payment", entityId: paymentId, entityName: p.reference, action: "updated",
    summary: `Payment ${p.reference} verified — ${money(p.amount)} from ${tenantName(p.tenantId)}${invoice ? `, invoice ${invoice.number} marked paid` : ""}`,
    before, after: { state: "successful", status: "completed" },
    notify: { type: "payment", title: "Payment verified", body: `${p.reference} verified — ${money(p.amount)}.` },
  });
  pushNotify("payment", "Payment verified",
    `Your payment of ${money(p.amount)} has been verified. Thank you.`, "payment", paymentId, "updated", ["tenant"]);
  return p;
}

/** Admin rejects a payment that could not be verified. */
export async function rejectPayment(paymentId: string, reason: string): Promise<Payment> {
  await mDelay();
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p) throw new Error("Payment not found");
  const before = { state: paymentState(p), status: p.status };

  p.state = "failed";
  p.status = "failed";
  p.failureReason = reason.trim();
  p.stateChangedAt = db.NOW_ISO;
  // The invoice is deliberately left unpaid.

  recordMutation({
    entityType: "payment", entityId: paymentId, entityName: p.reference, action: "updated",
    summary: `Payment ${p.reference} rejected — ${p.failureReason}. Invoice remains unpaid.`,
    before, after: { state: "failed", failureReason: p.failureReason },
    notify: { type: "payment", title: "Payment rejected", body: `${p.reference} could not be verified — ${p.failureReason}` },
  });
  pushNotify("payment", "Payment could not be verified",
    `We couldn’t verify your payment of ${money(p.amount)} — ${p.failureReason}. Please try again or contact support.`,
    "payment", paymentId, "updated", ["tenant"]);
  return p;
}

/**
 * Re-poll a pending payment. Mocked: the backend will own the real status check,
 * so this simply reports the state we already hold.
 */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentState> {
  await mDelay(700);
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p) throw new Error("Payment not found");
  return paymentState(p);
}
