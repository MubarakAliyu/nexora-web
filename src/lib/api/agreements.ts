/**
 * Management Agreements API + commission math. The agreement is the single
 * source of truth for every commission/settlement calculation — no hardcoded
 * percentages anywhere. Mutations flow through recordMutation (toast is fired
 * by the caller; notification + audit here).
 */

import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import type {
  ManagementAgreement, ContractType, SettlementSchedule,
} from "@/lib/mock/types";

export type { ManagementAgreement, ContractType, SettlementSchedule, AgreementStatus } from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const NOW = db.NOW_ISO;

/* --------------------------------------------------------- read accessors */

export async function fetchAgreements(scope?: { forceError?: boolean }): Promise<ManagementAgreement[]> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load agreements. Please try again.");
  return [...db.agreements];
}

export async function fetchAgreementById(id: string): Promise<ManagementAgreement | undefined> {
  await mDelay(250);
  return db.agreements.find((a) => a.id === id);
}

export async function fetchAgreementByOwner(ownerId: string, scope?: { forceError?: boolean }): Promise<ManagementAgreement | undefined> {
  await mDelay(300);
  if (scope?.forceError) throw new Error("Failed to load agreement.");
  return db.getAgreementForOwner(ownerId);
}

export function getAgreementForOwner(ownerId: string) {
  return db.getAgreementForOwner(ownerId);
}
export function isSettlementReady(ownerId: string) {
  return db.isSettlementReady(ownerId);
}

/* ------------------------------------------------------- commission math */

const PERIOD_MONTHS: Record<NonNullable<ManagementAgreement["fixedFrequency"]>, number> = {
  monthly: 1, quarterly: 3, annual: 12,
};

/** Whole months between two ISO dates (min 1 when the range is non-empty). */
export function monthsElapsed(agreement: ManagementAgreement, nowIso = NOW): number {
  const start = new Date(agreement.effectiveDate).getTime();
  const end = Math.min(new Date(agreement.expiryDate).getTime(), new Date(nowIso).getTime());
  if (end <= start) return 0;
  return Math.max(1, Math.round((end - start) / (30 * 86_400_000)));
}

/** Nexora's commission/fee earned on `grossRevenue` under this agreement. */
export function commissionForAgreement(agreement: ManagementAgreement, grossRevenue: number, nowIso = NOW): number {
  const months = monthsElapsed(agreement, nowIso);
  switch (agreement.contractType) {
    case "revenue_sharing":
      return Math.round(grossRevenue * ((agreement.commissionPercentage ?? 0) / 100));
    case "fixed_fee": {
      const per = (agreement.fixedAmount ?? 0) / PERIOD_MONTHS[agreement.fixedFrequency ?? "annual"];
      return Math.round(per * months);
    }
    case "hybrid": {
      const per = (agreement.hybridFixedAmount ?? 0) / PERIOD_MONTHS[agreement.fixedFrequency ?? "monthly"];
      return Math.round(per * months + grossRevenue * ((agreement.hybridPercentage ?? 0) / 100));
    }
  }
}

/** Commission on a single month's gross revenue under this agreement. */
export function monthlyCommission(a: ManagementAgreement, monthlyGross: number): number {
  switch (a.contractType) {
    case "revenue_sharing":
      return Math.round(monthlyGross * ((a.commissionPercentage ?? 0) / 100));
    case "fixed_fee":
      return Math.round((a.fixedAmount ?? 0) / PERIOD_MONTHS[a.fixedFrequency ?? "annual"]);
    case "hybrid":
      return Math.round((a.hybridFixedAmount ?? 0) / PERIOD_MONTHS[a.fixedFrequency ?? "monthly"] + monthlyGross * ((a.hybridPercentage ?? 0) / 100));
  }
}

/** Effective commission rate for a given gross (drives displayed %). */
export function effectiveRate(a: ManagementAgreement, gross: number): number {
  return gross > 0 ? monthlyCommission(a, gross) / gross : 0;
}

/** Human rate label for tables/badges, e.g. "15%" or "UGX 5,000,000/yr". */
export function agreementRateLabel(a: ManagementAgreement): string {
  const money = (n: number) => new Intl.NumberFormat("en-UG").format(n);
  const freqShort = (f?: string) => (f === "annual" ? "yr" : f === "quarterly" ? "qtr" : "mo");
  switch (a.contractType) {
    case "revenue_sharing": return `${a.commissionPercentage ?? 0}%`;
    case "fixed_fee": return `UGX ${money(a.fixedAmount ?? 0)}/${freqShort(a.fixedFrequency)}`;
    case "hybrid": return `UGX ${money(a.hybridFixedAmount ?? 0)}/${freqShort(a.fixedFrequency)} + ${a.hybridPercentage ?? 0}%`;
  }
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  fixed_fee: "Fixed Fee", revenue_sharing: "Revenue Sharing", hybrid: "Hybrid",
};

export interface AgreementFinancials {
  grossRevenue: number;
  commissionEarned: number;
  expenses: number;
  netToOwner: number;
  settledToOwner: number;
  pending: number;
}

/** Gross revenue collected on an owner's properties (completed rent payments). */
export function ownerGrossRevenue(ownerId: string): number {
  const owner = db.owners.find((o) => o.id === ownerId);
  const ids = new Set(owner?.propertyIds ?? []);
  return db.payments
    .filter((p) => p.status === "completed" && ids.has(p.propertyId))
    .reduce((s, p) => s + p.amount, 0);
}

/** Total expenses logged against an owner's properties. */
export function ownerExpenses(ownerId: string): number {
  const owner = db.owners.find((o) => o.id === ownerId);
  const ids = new Set(owner?.propertyIds ?? []);
  return db.expenses.filter((e) => ids.has(e.propertyId)).reduce((s, e) => s + e.amount, 0);
}

/** Financial summary for an agreement, calculated from real payment data. */
export async function fetchAgreementFinancials(agreementId: string): Promise<AgreementFinancials> {
  await mDelay(300);
  const a = db.agreements.find((x) => x.id === agreementId);
  if (!a) throw new Error("Agreement not found");
  return agreementFinancials(a);
}

export function agreementFinancials(a: ManagementAgreement): AgreementFinancials {
  const grossRevenue = ownerGrossRevenue(a.ownerId);
  const commissionEarned = commissionForAgreement(a, grossRevenue);
  const expenses = ownerExpenses(a.ownerId);
  // Canonical owner net = gross − commission − property expenses (reconciles across
  // admin Financial Overview, admin Agreements detail and the owner portal).
  const netToOwner = Math.max(0, grossRevenue - commissionEarned - expenses);
  // The latest month's net is treated as still-pending settlement; the rest is settled.
  const owner = db.owners.find((o) => o.id === a.ownerId);
  const ids = new Set(owner?.propertyIds ?? []);
  const months = new Set(db.payments.filter((p) => ids.has(p.propertyId)).map((p) => p.date.slice(0, 7)));
  const monthCount = Math.max(1, months.size);
  const pending = Math.round(netToOwner / monthCount);
  const settledToOwner = Math.max(0, netToOwner - pending);
  return { grossRevenue, commissionEarned, expenses, netToOwner, settledToOwner, pending };
}

/* --------------------------------------------------------- mutations */

export interface AgreementInput {
  ownerId: string;
  contractType: ContractType;
  fixedAmount?: number;
  fixedFrequency?: "monthly" | "quarterly" | "annual";
  commissionPercentage?: number;
  hybridFixedAmount?: number;
  hybridPercentage?: number;
  effectiveDate: string;
  expiryDate: string;
  settlementSchedule: SettlementSchedule;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  payoutAccountName?: string;
  notes?: string;
}

function ownerName(ownerId: string) {
  return db.owners.find((o) => o.id === ownerId)?.name ?? "—";
}

export async function createAgreement(input: AgreementInput): Promise<ManagementAgreement> {
  await mDelay(500);
  const name = ownerName(input.ownerId);
  const agreement: ManagementAgreement = {
    id: `agr_${Date.now()}`,
    ownerId: input.ownerId,
    ownerName: name,
    contractType: input.contractType,
    fixedAmount: input.fixedAmount,
    fixedFrequency: input.fixedFrequency,
    commissionPercentage: input.commissionPercentage,
    hybridFixedAmount: input.hybridFixedAmount,
    hybridPercentage: input.hybridPercentage,
    effectiveDate: input.effectiveDate,
    expiryDate: input.expiryDate,
    settlementSchedule: input.settlementSchedule,
    payoutBankName: input.payoutBankName,
    payoutAccountNumber: input.payoutAccountNumber,
    payoutAccountName: input.payoutAccountName,
    status: "active",
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.agreements.unshift(agreement);
  recordMutation({
    entityType: "agreement", entityId: agreement.id, entityName: name, action: "created",
    summary: `Management agreement created — ${name} (${CONTRACT_TYPE_LABEL[agreement.contractType]}, ${agreementRateLabel(agreement)})`,
    after: { type: agreement.contractType, rate: agreementRateLabel(agreement) },
    notify: { type: "system", title: "New management agreement", body: `${name} — ${CONTRACT_TYPE_LABEL[agreement.contractType]}, ${agreementRateLabel(agreement)}` },
  });
  return agreement;
}

export async function updateAgreement(id: string, input: AgreementInput): Promise<ManagementAgreement> {
  await mDelay(500);
  const a = db.agreements.find((x) => x.id === id);
  if (!a) throw new Error("Agreement not found");
  const before = { type: a.contractType, rate: agreementRateLabel(a) };
  Object.assign(a, {
    contractType: input.contractType,
    fixedAmount: input.fixedAmount,
    fixedFrequency: input.fixedFrequency,
    commissionPercentage: input.commissionPercentage,
    hybridFixedAmount: input.hybridFixedAmount,
    hybridPercentage: input.hybridPercentage,
    effectiveDate: input.effectiveDate,
    expiryDate: input.expiryDate,
    settlementSchedule: input.settlementSchedule,
    payoutBankName: input.payoutBankName,
    payoutAccountNumber: input.payoutAccountNumber,
    payoutAccountName: input.payoutAccountName,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  });
  recordMutation({
    entityType: "agreement", entityId: a.id, entityName: a.ownerName, action: "updated",
    summary: `Management agreement updated — ${a.ownerName}`,
    before, after: { type: a.contractType, rate: agreementRateLabel(a) },
    notify: { type: "system", title: "Agreement updated", body: `${a.ownerName} — ${CONTRACT_TYPE_LABEL[a.contractType]}, ${agreementRateLabel(a)}` },
  });
  return a;
}

export async function terminateAgreement(id: string, terminationDate: string, reason: string): Promise<ManagementAgreement> {
  await mDelay(400);
  const a = db.agreements.find((x) => x.id === id);
  if (!a) throw new Error("Agreement not found");
  const before = { status: a.status };
  a.status = "terminated";
  a.updatedAt = new Date().toISOString();
  a.notes = [a.notes, `Terminated ${terminationDate}: ${reason}`].filter(Boolean).join(" · ");
  recordMutation({
    entityType: "agreement", entityId: a.id, entityName: a.ownerName, action: "updated",
    summary: `Management agreement terminated — ${a.ownerName} (${terminationDate})`,
    before, after: { status: "terminated", reason },
    notify: { type: "system", title: "Agreement terminated", body: `${a.ownerName}'s agreement was terminated.` },
  });
  return a;
}

export async function deleteAgreement(id: string): Promise<{ ok: true }> {
  await mDelay(400);
  const idx = db.agreements.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Agreement not found");
  const [removed] = db.agreements.splice(idx, 1);
  recordMutation({
    entityType: "agreement", entityId: id, entityName: removed.ownerName, action: "deleted",
    summary: `Management agreement deleted — ${removed.ownerName}`,
    notify: { type: "system", title: "Agreement deleted", body: `${removed.ownerName}'s agreement was deleted.` },
  });
  return { ok: true };
}
