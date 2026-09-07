/**
 * Worker earnings, payout destinations and payout requests (G1/B1–B6).
 *
 * ON THE "NO WALLET" RULE. The 27 August minutes said "do not add a worker
 * wallet unless separately approved". The client has now explicitly asked for
 * balances, withdrawals, payout requests and bank accounts, and the G1 brief
 * states in terms: "THIS IS THAT APPROVAL." This module is that approval being
 * exercised, and is recorded as such so nobody later reads it as a violation.
 *
 * THE BALANCE IS DERIVED, NEVER STORED:
 *
 *     available = earned − withdrawn − in flight
 *
 * where "withdrawn" is everything already paid out and "in flight" is every
 * request that has been raised and not yet rejected or cancelled. There is no
 * top-up, no transfer, and no way for a balance to exist that is not backed by
 * a completed job.
 *
 * ⚠️ ON ACCOUNT NUMBERS. `WorkerBankAccount.accountNumber` is the only place a
 * full number lives. Everything this module emits — summaries, notification
 * bodies, audit entries — goes through `maskAccount`. Only the edit form renders
 * the full value.
 *
 * ⚠️ ON OWNER SETTLEMENTS. A worker payout is a Nexora operating cost, not an
 * owner deduction. Nothing here touches `db.expenses`, an owner, a property or
 * an agreement, which is what keeps E4's settlement maths unmoved; the payout
 * appears in the financial ledger as an outgoing Nexora transaction and its fee
 * as Nexora revenue. See the "does not touch owner settlements" note in B6.
 */
import * as db from "@/lib/mock/db";
import { activeExchangeRate } from "@/lib/stores/preferences";
import { formatCurrencyRecordedFull } from "@/lib/format";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import { earningsFor, payoutsFor } from "@/lib/api/worker-jobs";
import type {
  Staff, Currency, WorkerBankAccount, WorkerAccountType,
  PayoutSchedule, PayoutFrequency, PayoutRequest, PayoutRequestStatus,
} from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const money = (n: number, c: Currency = "UGX") => formatCurrencyRecordedFull(n, c);

/* ------------------------------------------------------------- masking */

/**
 * The ONLY safe way to render an account number outside the edit form.
 *
 * Keeps the last four so a worker can tell two accounts apart, and nothing more.
 * A mobile-money number keeps its country prefix for the same reason.
 */
export function maskAccount(accountNumber: string): string {
  const s = (accountNumber ?? "").trim();
  if (s.length <= 4) return "••••";
  return `•••• ${s.slice(-4)}`;
}

/** "Stanbic Bank Uganda •••• 5678" — the label used in every list and message. */
export function accountLabel(a: WorkerBankAccount | undefined): string {
  if (!a) return "—";
  return `${a.institution} ${maskAccount(a.accountNumber)}`;
}

export const ACCOUNT_TYPE_LABEL: Record<WorkerAccountType, string> = {
  bank: "Bank account",
  mobile_money: "Mobile money",
};

/* ----------------------------------------------------------- schedules */

export const PAYOUT_FREQUENCY_LABEL: Record<PayoutFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  on_demand: "On demand",
};

const WEEKDAY_LABEL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function globalSchedule(): PayoutSchedule {
  return db.payoutSchedules.find((s) => s.staffId === null) ?? db.payoutSchedules[0];
}

/** A worker's own schedule if they have an override, otherwise the global one. */
export function scheduleFor(staffId: string | undefined | null): PayoutSchedule {
  return db.payoutSchedules.find((s) => s.staffId === staffId) ?? globalSchedule();
}

export function hasScheduleOverride(staffId: string): boolean {
  return db.payoutSchedules.some((s) => s.staffId === staffId);
}

/** "Every two weeks, on a Friday" / "Monthly, on the 28th". */
export function scheduleText(s: PayoutSchedule): string {
  switch (s.frequency) {
    case "on_demand":
      return "Paid on demand — request whenever you have a balance";
    case "monthly":
      return `Monthly, on day ${s.payoutDay} of the month`;
    default:
      return `${PAYOUT_FREQUENCY_LABEL[s.frequency]}, on ${WEEKDAY_LABEL[Math.min(6, Math.max(0, s.payoutDay - 1))]}`;
  }
}

/**
 * The next date this schedule pays out, from the fixed mock "now".
 *
 * Returns null for on-demand, which has no next date — the earnings screen
 * shows a different message rather than an empty countdown.
 */
export function nextPayoutDate(s: PayoutSchedule): string | null {
  if (s.frequency === "on_demand") return null;
  const now = new Date(db.NOW_ISO);
  const d = new Date(now);
  if (s.frequency === "monthly") {
    d.setUTCDate(s.payoutDay);
    if (d <= now) d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString();
  }
  // ISO weekday: Monday = 1 … Sunday = 7.
  const target = Math.min(7, Math.max(1, s.payoutDay));
  const current = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  let delta = target - current;
  if (delta <= 0) delta += 7;
  if (s.frequency === "biweekly" && delta < 7) delta += 7;
  d.setUTCDate(now.getUTCDate() + delta);
  return d.toISOString();
}

/** Whole days from the mock "now" to the next payout. */
export function daysToNextPayout(s: PayoutSchedule): number | null {
  const next = nextPayoutDate(s);
  if (!next) return null;
  const ms = new Date(next).getTime() - new Date(db.NOW_ISO).getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export interface SaveScheduleInput {
  staffId: string | null;
  frequency: PayoutFrequency;
  payoutDay: number;
  minimumPayout: number;
  processingFeePercent: number;
}

/**
 * Commit a schedule (global default or per-worker override).
 *
 * Save-owned like the F3 threshold and the G1/A1 exchange rate: nothing is
 * written on blur, so a half-typed minimum never becomes policy.
 */
export async function savePayoutSchedule(input: SaveScheduleInput, actor: string): Promise<PayoutSchedule> {
  await mDelay();
  if (input.processingFeePercent < 0 || input.processingFeePercent > 100) {
    throw new Error("Processing fee must be between 0 and 100 percent.");
  }
  if (input.minimumPayout < 0) throw new Error("Minimum payout cannot be negative.");

  const existing = db.payoutSchedules.find((s) => s.staffId === input.staffId);
  const before = existing ? { ...existing } : undefined;
  const row: PayoutSchedule = existing ?? {
    id: `psc_${Date.now()}`, staffId: input.staffId,
    frequency: input.frequency, payoutDay: input.payoutDay,
    minimumPayout: input.minimumPayout, processingFeePercent: input.processingFeePercent,
    /* A schedule is policy, not a transaction: its minimum is a base-currency
       figure, so it is pinned to UGX rather than to whatever the admin happens
       to be viewing in. The field is labelled UGX to match, like the F3 owner
       approval threshold. */
    currency: "UGX", updatedAt: db.NOW_ISO, updatedBy: actor,
  };
  row.frequency = input.frequency;
  row.payoutDay = input.payoutDay;
  row.minimumPayout = input.minimumPayout;
  row.processingFeePercent = input.processingFeePercent;
  row.updatedAt = db.NOW_ISO;
  row.updatedBy = actor;
  if (!existing) db.payoutSchedules.push(row);

  const who = input.staffId
    ? db.staff.find((s) => s.id === input.staffId)?.name ?? "worker"
    : "all workers";
  recordMutation({
    entityType: "payout_schedule", entityId: row.id, entityName: input.staffId ? `${who} payout schedule` : "Default payout schedule",
    action: existing ? "updated" : "created",
    summary: `Payout schedule for ${who} set to ${scheduleText(row).toLowerCase()}, minimum ${money(row.minimumPayout, row.currency)}, fee ${row.processingFeePercent}% by ${actor}`,
    before: before && { frequency: before.frequency, payoutDay: before.payoutDay, minimumPayout: before.minimumPayout, processingFeePercent: before.processingFeePercent },
    after: { frequency: row.frequency, payoutDay: row.payoutDay, minimumPayout: row.minimumPayout, processingFeePercent: row.processingFeePercent },
    notify: {
      type: "system", title: "Payout schedule updated",
      body: `${input.staffId ? `${who}'s` : "The default"} payout schedule is now ${scheduleText(row).toLowerCase()}.`,
      audiences: ["admin"],
    },
  });

  // The worker whose terms changed is told directly, in their own voice.
  if (input.staffId) {
    pushNotify(
      "system", "Your payout schedule changed",
      `You are now paid ${scheduleText(row).toLowerCase()}. Minimum payout ${money(row.minimumPayout, row.currency)}, processing fee ${row.processingFeePercent}%.`,
      "payout_schedule", row.id, "updated", ["worker"], input.staffId,
    );
  }
  return row;
}

/* ------------------------------------------------------------ accounts */

export function accountsFor(staffId: string | undefined): WorkerBankAccount[] {
  if (!staffId) return [];
  return db.workerBankAccounts
    .filter((a) => a.staffId === staffId)
    .slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function accountById(id: string | undefined | null): WorkerBankAccount | undefined {
  if (!id) return undefined;
  return db.workerBankAccounts.find((a) => a.id === id);
}

export function primaryAccountFor(staffId: string | undefined): WorkerBankAccount | undefined {
  const list = accountsFor(staffId);
  return list.find((a) => a.isPrimary) ?? list[0];
}

export interface BankAccountInput {
  id?: string;
  staffId: string;
  accountType: WorkerAccountType;
  institution: string;
  accountName: string;
  accountNumber: string;
  branch?: string | null;
  isPrimary: boolean;
}

export async function saveBankAccount(input: BankAccountInput, actor: string): Promise<WorkerBankAccount> {
  await mDelay();
  const digits = input.accountNumber.replace(/[^\d]/g, "");
  if (digits.length < 6) throw new Error("Enter a valid account or mobile-money number.");

  const existing = input.id ? db.workerBankAccounts.find((a) => a.id === input.id) : undefined;
  const row: WorkerBankAccount = existing ?? {
    id: `wba_${Date.now()}`, staffId: input.staffId,
    accountType: input.accountType, institution: input.institution.trim(),
    accountName: input.accountName.trim(), accountNumber: input.accountNumber.trim(),
    branch: input.branch?.trim() || null, isPrimary: input.isPrimary,
    addedAt: db.NOW_ISO, updatedAt: db.NOW_ISO,
  };
  row.accountType = input.accountType;
  row.institution = input.institution.trim();
  row.accountName = input.accountName.trim();
  row.accountNumber = input.accountNumber.trim();
  row.branch = input.branch?.trim() || null;
  row.updatedAt = db.NOW_ISO;
  if (!existing) db.workerBankAccounts.push(row);

  // Exactly one primary per worker.
  if (input.isPrimary || accountsFor(input.staffId).every((a) => a.id === row.id || !a.isPrimary)) {
    db.workerBankAccounts.forEach((a) => {
      if (a.staffId === input.staffId) a.isPrimary = a.id === row.id;
    });
  }

  recordMutation({
    entityType: "bank_account", entityId: row.id, entityName: accountLabel(row),
    action: existing ? "updated" : "created",
    // ⚠️ masked — an audit entry is exported and read by people who do not need
    // the full number.
    summary: `${existing ? "Updated" : "Added"} payout destination ${accountLabel(row)} (${ACCOUNT_TYPE_LABEL[row.accountType]}) for ${db.staff.find((s) => s.id === row.staffId)?.name ?? "worker"} by ${actor}`,
    after: { institution: row.institution, masked: maskAccount(row.accountNumber), isPrimary: row.isPrimary },
    notify: false,
  });
  return row;
}

export async function setPrimaryAccount(accountId: string, actor: string): Promise<void> {
  await mDelay(250);
  const row = db.workerBankAccounts.find((a) => a.id === accountId);
  if (!row) throw new Error("Account not found.");
  db.workerBankAccounts.forEach((a) => {
    if (a.staffId === row.staffId) a.isPrimary = a.id === accountId;
  });
  recordMutation({
    entityType: "bank_account", entityId: row.id, entityName: accountLabel(row), action: "updated",
    summary: `${accountLabel(row)} set as the default payout destination by ${actor}`,
    after: { isPrimary: true },
    notify: false,
  });
}

export async function deleteBankAccount(accountId: string, actor: string): Promise<void> {
  await mDelay(250);
  const i = db.workerBankAccounts.findIndex((a) => a.id === accountId);
  if (i < 0) return;
  const row = db.workerBankAccounts[i];
  const inFlight = db.payoutRequests.some(
    (r) => r.accountId === accountId && (r.status === "pending" || r.status === "approved"),
  );
  if (inFlight) throw new Error("This account has a payout in progress. Wait for it to be paid before removing it.");
  db.workerBankAccounts.splice(i, 1);
  // If the primary went, promote whatever is left so a request always has a home.
  const rest = accountsFor(row.staffId);
  if (row.isPrimary && rest.length > 0) rest[0].isPrimary = true;
  recordMutation({
    entityType: "bank_account", entityId: row.id, entityName: accountLabel(row), action: "deleted",
    summary: `Removed payout destination ${accountLabel(row)} by ${actor}`,
    before: { institution: row.institution, masked: maskAccount(row.accountNumber) },
    notify: false,
  });
}

/* ------------------------------------------------------------- balance */

export interface WorkerBalance {
  /** Everything the ledger says they have earned, ever. */
  totalEarned: number;
  /** Everything actually paid out — F4 payouts plus G1 requests marked paid. */
  withdrawn: number;
  /** Raised and not yet resolved: reserved, so it cannot be requested twice. */
  pending: number;
  /** Processing fees taken out of paid requests. */
  feesDeducted: number;
  /** The headline figure: earned − withdrawn − pending. */
  available: number;
  currency: Currency;
}

export function requestsFor(staffId: string | undefined): PayoutRequest[] {
  if (!staffId) return [];
  return db.payoutRequests
    .filter((r) => r.staffId === staffId)
    .slice()
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

/** A request that has reserved money: raised, not rejected, not cancelled. */
const IN_FLIGHT: PayoutRequestStatus[] = ["pending", "approved"];

export function workerBalance(member: Staff | undefined): WorkerBalance {
  const empty: WorkerBalance = {
    totalEarned: 0, withdrawn: 0, pending: 0, feesDeducted: 0, available: 0, currency: "UGX",
  };
  if (!member) return empty;

  const totalEarned = earningsFor(member).reduce((s, e) => s + e.amount, 0);
  const mine = requestsFor(member.id);

  /* The F4 payout ledger still exists and still holds this worker's history.
     Counting only the G1 requests would show a worker money they were paid
     months ago as though it were still available — the read path has to know
     about BOTH stores. */
  const legacyPaid = payoutsFor(member)
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const legacyInFlight = payoutsFor(member)
    .filter((p) => p.status === "requested" || p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);

  const withdrawn = legacyPaid + mine.filter((r) => r.status === "paid").reduce((s, r) => s + r.amountRequested, 0);
  const pending = legacyInFlight + mine.filter((r) => IN_FLIGHT.includes(r.status)).reduce((s, r) => s + r.amountRequested, 0);
  const feesDeducted = mine.filter((r) => r.status === "paid").reduce((s, r) => s + r.fee, 0);

  return {
    totalEarned, withdrawn, pending, feesDeducted,
    available: Math.max(0, totalEarned - withdrawn - pending),
    currency: "UGX",
  };
}

/** The processing fee on an amount, under the worker's schedule. */
export function feeFor(amount: number, schedule: PayoutSchedule): number {
  return Math.max(0, Math.round((amount * schedule.processingFeePercent) / 100));
}

export interface FeePreview {
  requested: number;
  fee: number;
  net: number;
  feePercent: number;
}

export function previewFee(amount: number, staffId: string | undefined): FeePreview {
  const s = scheduleFor(staffId);
  const fee = feeFor(amount, s);
  return { requested: amount, fee, net: Math.max(0, amount - fee), feePercent: s.processingFeePercent };
}

/**
 * Why a worker cannot request right now — or null when they can.
 *
 * Returned as a sentence rather than a boolean so the disabled button can say
 * what is wrong instead of leaving the worker guessing.
 */
export function payoutBlockedReason(member: Staff | undefined): string | null {
  if (!member) return "Sign in as a worker to request a payout.";
  const bal = workerBalance(member);
  const s = scheduleFor(member.id);
  if (accountsFor(member.id).length === 0) {
    return "Add a bank or mobile-money account to your profile first.";
  }
  if (bal.available <= 0) {
    return bal.pending > 0
      ? `Your balance is already committed to a payout request of ${money(bal.pending, bal.currency)}.`
      : "You have no available balance yet. Complete a job to earn.";
  }
  if (bal.available < s.minimumPayout) {
    return `Minimum payout is ${money(s.minimumPayout, bal.currency)}. You need ${money(s.minimumPayout - bal.available, bal.currency)} more.`;
  }
  return null;
}

/* ------------------------------------------------------------ requests */

export interface CreatePayoutRequestInput {
  member: Staff;
  amount: number;
  accountId: string;
}

export async function createPayoutRequest(input: CreatePayoutRequestInput): Promise<PayoutRequest> {
  await mDelay();
  const { member, amount, accountId } = input;
  const bal = workerBalance(member);
  const schedule = scheduleFor(member.id);

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  if (amount > bal.available) throw new Error(`That is more than your available balance of ${money(bal.available, bal.currency)}.`);
  if (amount < schedule.minimumPayout) throw new Error(`Minimum payout is ${money(schedule.minimumPayout, bal.currency)}.`);
  const account = accountById(accountId);
  if (!account || account.staffId !== member.id) throw new Error("Choose a payout destination.");

  const fee = feeFor(amount, schedule);
  const row: PayoutRequest = {
    /* ⚠️ Recorded in the LEDGER's currency, not the viewer's.
       A payout is drawn from the earnings ledger, so it is denominated the same
       way the ledger is. Stamping `activeCurrency()` here — the F5 reflex, right
       for a record the user is authoring from scratch — would label a shilling
       figure as dollars the moment a worker switched their display preference. */
    currency: bal.currency,
    exchangeRateAtCreation: activeExchangeRate(),
    id: `pyr_${Date.now()}`,
    reference: `NX-PR-${Math.floor(2000 + Math.random() * 7999)}`,
    staffId: member.id, staffName: member.name,
    amountRequested: Math.round(amount), fee, netAmount: Math.round(amount) - fee,
    accountId, status: "pending",
    requestedAt: db.NOW_ISO,
    decidedAt: null, decidedBy: null, paidAt: null, paidBy: null,
    rejectionReason: null, transactionId: null,
  };
  db.payoutRequests.unshift(row);

  recordMutation({
    entityType: "payout_request", entityId: row.id, entityName: row.reference, action: "created",
    summary: `${member.name} requested a payout of ${money(row.amountRequested, row.currency)} to ${accountLabel(account)} — fee ${money(row.fee, row.currency)}, net ${money(row.netAmount, row.currency)} (${row.reference})`,
    after: { amount: row.amountRequested, fee: row.fee, net: row.netAmount, status: row.status },
    notify: {
      type: "payment", title: "Payout request awaiting approval",
      body: `${member.name} requested ${money(row.amountRequested, row.currency)} to ${accountLabel(account)} — ${row.reference}.`,
      audiences: ["admin"],
    },
  });

  /* F4 pattern — this concerns ONE worker, so it is scoped to them rather than
     broadcast to the "worker" audience. Without recipientStaffId every worker
     reads about every other worker's money. */
  pushNotify(
    "payment", "Payout request submitted",
    `Your request for ${money(row.amountRequested, row.currency)} to ${accountLabel(account)} is with the admin team. Net after the ${schedule.processingFeePercent}% fee: ${money(row.netAmount, row.currency)}.`,
    "payout_request", row.id, "created", ["worker"], member.id,
  );
  return row;
}

export async function cancelPayoutRequest(id: string, actor: string): Promise<PayoutRequest> {
  await mDelay(300);
  const row = db.payoutRequests.find((r) => r.id === id);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "pending") throw new Error("Only a pending request can be cancelled.");
  row.status = "cancelled";
  row.decidedAt = db.NOW_ISO;
  row.decidedBy = actor;

  recordMutation({
    entityType: "payout_request", entityId: row.id, entityName: row.reference, action: "updated",
    summary: `${row.staffName} cancelled payout request ${row.reference} — ${money(row.amountRequested, row.currency)} returned to their available balance`,
    before: { status: "pending" }, after: { status: "cancelled" },
    notify: {
      type: "payment", title: "Payout request cancelled",
      body: `${row.staffName} cancelled ${row.reference} (${money(row.amountRequested, row.currency)}).`,
      audiences: ["admin"],
    },
  });
  return row;
}

export async function approvePayoutRequest(id: string, actor: string): Promise<PayoutRequest> {
  await mDelay(350);
  const row = db.payoutRequests.find((r) => r.id === id);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "pending") throw new Error("Only a pending request can be approved.");
  row.status = "approved";
  row.decidedAt = db.NOW_ISO;
  row.decidedBy = actor;

  recordMutation({
    entityType: "payout_request", entityId: row.id, entityName: row.reference, action: "updated",
    summary: `Payout request ${row.reference} approved — ${money(row.amountRequested, row.currency)} to ${row.staffName}, net ${money(row.netAmount, row.currency)} by ${actor}`,
    before: { status: "pending" }, after: { status: "approved", decidedBy: actor },
    notify: {
      type: "payment", title: "Payout approved",
      body: `${row.reference} approved — ${money(row.amountRequested, row.currency)} to ${row.staffName}.`,
      audiences: ["admin"],
    },
  });
  pushNotify(
    "payment", "Your payout was approved",
    `${row.reference} for ${money(row.amountRequested, row.currency)} has been approved. ${money(row.netAmount, row.currency)} will reach ${accountLabel(accountById(row.accountId))}.`,
    "payout_request", row.id, "updated", ["worker"], row.staffId,
  );
  return row;
}

export async function rejectPayoutRequest(id: string, reason: string, actor: string): Promise<PayoutRequest> {
  await mDelay(350);
  const row = db.payoutRequests.find((r) => r.id === id);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "pending" && row.status !== "approved") throw new Error("This request can no longer be rejected.");
  const text = reason.trim();
  if (!text) throw new Error("Give a reason — the worker sees it.");
  row.status = "rejected";
  row.decidedAt = db.NOW_ISO;
  row.decidedBy = actor;
  row.rejectionReason = text;

  recordMutation({
    entityType: "payout_request", entityId: row.id, entityName: row.reference, action: "updated",
    summary: `Payout request ${row.reference} rejected by ${actor} — ${money(row.amountRequested, row.currency)} returned to ${row.staffName}'s available balance. Reason: ${text}`,
    before: { status: "pending" }, after: { status: "rejected", reason: text },
    notify: {
      type: "payment", title: "Payout rejected",
      body: `${row.reference} rejected — ${money(row.amountRequested, row.currency)} returned to ${row.staffName}'s balance.`,
      audiences: ["admin"],
    },
  });
  pushNotify(
    "payment", "Your payout request was not approved",
    `${row.reference} for ${money(row.amountRequested, row.currency)} was not approved: ${text} The amount is back in your available balance.`,
    "payout_request", row.id, "updated", ["worker"], row.staffId,
  );
  return row;
}

/**
 * Mark an approved request paid (B6).
 *
 * This is where the money leaves Nexora. It stamps a transaction id so the
 * financial ledger can show the outgoing payment and the fee as Nexora revenue.
 * It deliberately does NOT create an expense, touch an owner, a property or an
 * agreement — a worker payout is a Nexora operating cost, and routing it
 * anywhere near `db.expenses` would silently reduce an owner's settlement.
 */
export async function markPayoutPaid(id: string, actor: string): Promise<PayoutRequest> {
  await mDelay(400);
  const row = db.payoutRequests.find((r) => r.id === id);
  if (!row) throw new Error("Request not found.");
  if (row.status !== "approved") throw new Error("Approve the request before marking it paid.");
  row.status = "paid";
  row.paidAt = db.NOW_ISO;
  row.paidBy = actor;
  row.transactionId = `tx_payout_${row.id}`;

  recordMutation({
    entityType: "payout_request", entityId: row.id, entityName: row.reference, action: "updated",
    summary: `Payout ${row.reference} paid — ${money(row.netAmount, row.currency)} to ${row.staffName} at ${accountLabel(accountById(row.accountId))}; Nexora retained ${money(row.fee, row.currency)} in processing fees. Owner settlements unaffected.`,
    before: { status: "approved" }, after: { status: "paid", transactionId: row.transactionId, paidBy: actor },
    notify: {
      type: "payment", title: "Payout paid",
      body: `${row.reference} paid — ${money(row.netAmount, row.currency)} to ${row.staffName}.`,
      audiences: ["admin"],
    },
  });
  pushNotify(
    "payment", "You have been paid",
    `${money(row.netAmount, row.currency)} has been sent to ${accountLabel(accountById(row.accountId))} (${row.reference}).`,
    "payout_request", row.id, "updated", ["worker"], row.staffId,
  );
  return row;
}

export async function bulkApprovePayouts(ids: string[], actor: string): Promise<number> {
  let n = 0;
  for (const id of ids) {
    const row = db.payoutRequests.find((r) => r.id === id);
    if (!row || row.status !== "pending") continue;
    await approvePayoutRequest(id, actor);
    n += 1;
  }
  return n;
}

/* ------------------------------------------------------- admin queries */

export interface PayoutFilters {
  q?: string;
  status?: PayoutRequestStatus | "all";
  staffId?: string | "all";
  forceError?: boolean;
}

export async function listPayoutRequests(filters?: PayoutFilters): Promise<PayoutRequest[]> {
  await mDelay();
  if (filters?.forceError) throw new Error("Failed to load payout requests.");
  const f = filters ?? {};
  let rows = db.payoutRequests.slice().sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  if (f.status && f.status !== "all") rows = rows.filter((r) => r.status === f.status);
  if (f.staffId && f.staffId !== "all") rows = rows.filter((r) => r.staffId === f.staffId);
  if (f.q) {
    const s = f.q.toLowerCase();
    rows = rows.filter((r) => r.reference.toLowerCase().includes(s) || r.staffName.toLowerCase().includes(s));
  }
  return rows;
}

export interface PayoutKpis {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidThisMonth: number;
  feesEarned: number;
}

export async function getPayoutKpis(): Promise<PayoutKpis> {
  await mDelay(250);
  const now = new Date(db.NOW_ISO);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const pending = db.payoutRequests.filter((r) => r.status === "pending");
  const approved = db.payoutRequests.filter((r) => r.status === "approved");
  const paid = db.payoutRequests.filter((r) => r.status === "paid");
  return {
    pendingCount: pending.length,
    pendingAmount: pending.reduce((s, r) => s + r.amountRequested, 0),
    approvedCount: approved.length,
    approvedAmount: approved.reduce((s, r) => s + r.amountRequested, 0),
    paidThisMonth: paid.filter((r) => (r.paidAt ?? "") >= monthStart).reduce((s, r) => s + r.netAmount, 0),
    feesEarned: paid.reduce((s, r) => s + r.fee, 0),
  };
}

/** Count for the sidebar badge — the admin's cue that money is waiting. */
export function pendingPayoutCount(): number {
  return db.payoutRequests.filter((r) => r.status === "pending").length;
}

export const PAYOUT_STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};
