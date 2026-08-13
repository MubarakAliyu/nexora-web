/**
 * Owner settlement workflow (Revision D). Computes a period settlement entirely
 * from the owner's management agreement + real payment/expense data, and records
 * a processed settlement through the live engine (audit + notifications). No money
 * moves here — this is the ledger entry a real payout would reference.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import { pushNotify } from "@/lib/api/admin-mutations";
import {
  getAgreementForOwner, commissionForAgreement, agreementRateLabel, CONTRACT_TYPE_LABEL,
} from "@/lib/api/agreements";
import type { SettlementRecord } from "@/lib/mock/types";
export type { SettlementRecord } from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;

export interface SettlementLineItem { label: string; sub: string; amount: number; date?: string }

export interface SettlementComputation {
  ownerId: string;
  ownerName: string;
  hasAgreement: boolean;
  agreementId?: string;
  agreementTypeLabel?: string;
  rateLabel?: string;
  settlementSchedule?: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  rentPayments: SettlementLineItem[];
  grossRent: number;
  serviceRevenue: number;
  grossRevenue: number;
  managementFee: number;
  feeMath: string;
  expenseItems: SettlementLineItem[];
  expenses: number;
  depositDeductions: number;
  totalDeductions: number;
  netPayout: number;
  bankName?: string;
  bankMasked?: string;
  accountName?: string;
  hasBankDetails: boolean;
}

const periodLabelOf = (start: string, end: string) => {
  const s = new Date(start), e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth ? s.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
};

/** Compute an owner's settlement for a date range (inclusive). */
export function computeOwnerSettlement(ownerId: string, from: string, to: string): SettlementComputation {
  const owner = db.owners.find((o) => o.id === ownerId);
  const a = getAgreementForOwner(ownerId);
  const ids = new Set(owner?.propertyIds ?? []);
  const inPeriod = (iso: string) => iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;

  const rentPayments: SettlementLineItem[] = db.payments
    .filter((p) => p.status === "completed" && ids.has(p.propertyId) && inPeriod(p.date))
    .map((p) => {
      const t = db.tenants.find((x) => x.id === p.tenantId);
      const u = db.units.find((x) => x.id === t?.unitId);
      return { label: t?.name ?? "Tenant", sub: `${u?.label ?? "unit"} · ${db.properties.find((pr) => pr.id === p.propertyId)?.name ?? ""}`, amount: p.amount, date: p.date };
    });
  const grossRent = rentPayments.reduce((s, r) => s + r.amount, 0);
  const serviceRevenue = 0; // service bookings are not property/owner-scoped in the mock

  const allExpenses = db.expenses.filter((e) => ids.has(e.propertyId) && inPeriod(e.date));
  const depositItems = allExpenses.filter((e) => e.vendor === "Deposit Settlement");
  const normalExpenses = allExpenses.filter((e) => e.vendor !== "Deposit Settlement");
  const expenseItems: SettlementLineItem[] = normalExpenses.map((e) => ({
    label: db.properties.find((pr) => pr.id === e.propertyId)?.name ?? "Property",
    sub: `${e.category} · ${e.description}`, amount: e.amount, date: e.date,
  }));
  const expenses = normalExpenses.reduce((s, e) => s + e.amount, 0);
  const depositDeductions = depositItems.reduce((s, e) => s + e.amount, 0);

  const grossRevenue = grossRent + serviceRevenue;
  const managementFee = a ? commissionForAgreement(a, grossRevenue) : 0;
  const feeMath = a
    ? a.contractType === "revenue_sharing"
      ? `${a.commissionPercentage}% of ${money(grossRevenue)} = ${money(managementFee)}`
      : a.contractType === "fixed_fee"
        ? `Fixed fee: ${money(managementFee)} (${a.fixedFrequency})`
        : `Hybrid: ${money(a.hybridFixedAmount ?? 0)} + ${a.hybridPercentage}% = ${money(managementFee)}`
    : "No agreement";
  const totalDeductions = managementFee + expenses + depositDeductions;
  const netPayout = grossRevenue - totalDeductions;

  const acct = a?.payoutAccountNumber || owner?.accountNumber;
  return {
    ownerId, ownerName: owner?.name ?? "Owner", hasAgreement: !!a,
    agreementId: a?.id, agreementTypeLabel: a ? CONTRACT_TYPE_LABEL[a.contractType] : undefined,
    rateLabel: a ? agreementRateLabel(a) : undefined, settlementSchedule: a?.settlementSchedule,
    periodStart: from, periodEnd: to, periodLabel: periodLabelOf(from, to),
    rentPayments, grossRent, serviceRevenue, grossRevenue,
    managementFee, feeMath, expenseItems, expenses, depositDeductions, totalDeductions, netPayout,
    bankName: a?.payoutBankName || owner?.bankName,
    bankMasked: acct ? `•••• ${acct.slice(-4)}` : undefined,
    accountName: a?.payoutAccountName || owner?.name,
    hasBankDetails: !!acct,
  };
}

export interface ProcessSettlementInput {
  ownerId: string;
  from: string;
  to: string;
  note?: string;
}

/** Process a settlement → create the ledger record + audit + notifications. */
export async function processSettlement(input: ProcessSettlementInput): Promise<SettlementRecord> {
  await mDelay(500);
  const c = computeOwnerSettlement(input.ownerId, input.from, input.to);
  const a = getAgreementForOwner(input.ownerId);
  const rec: SettlementRecord = {
    id: `stl_${Date.now()}`,
    ownerId: c.ownerId, ownerName: c.ownerName, period: c.periodLabel,
    periodStart: c.periodStart, periodEnd: c.periodEnd,
    grossRevenue: c.grossRevenue, serviceRevenue: c.serviceRevenue,
    managementFee: c.managementFee, expenses: c.expenses, depositDeductions: c.depositDeductions,
    netPayout: Math.max(0, c.netPayout), bankMasked: c.bankMasked ?? "—",
    status: "completed", processedAt: db.NOW_ISO, processedBy: "Admin", note: input.note,
    agreementId: a?.id, agreementType: a?.contractType, agreementRate: c.rateLabel,
  };
  db.settlements.unshift(rec);
  recordMutation({
    entityType: "settlement", entityId: rec.id, entityName: rec.ownerName, action: "created",
    summary: `Owner settlement processed — ${rec.ownerName}, ${rec.period}: gross ${money(rec.grossRevenue)} − fee ${money(rec.managementFee)} − expenses ${money(rec.expenses)} = ${money(rec.netPayout)}`,
    after: { period: rec.period, gross: rec.grossRevenue, fee: rec.managementFee, expenses: rec.expenses, net: rec.netPayout },
    notify: { type: "system", title: "Settlement processed", body: `Settlement of ${money(rec.netPayout)} processed for ${rec.ownerName}, ${rec.period}.` },
  });
  pushNotify("system", "Settlement processed", `Settlement processed — ${money(rec.netPayout)} for ${rec.period}. View your statement in the Reports section.`, "settlement", rec.id, "created");
  return rec;
}

export async function listSettlements(ownerId?: string): Promise<SettlementRecord[]> {
  await mDelay(300);
  return ownerId ? db.settlements.filter((s) => s.ownerId === ownerId) : [...db.settlements];
}

/** True if a settlement covering (or after) the given period end already exists. */
export function hasSettlementForPeriod(ownerId: string, periodEnd: string): boolean {
  return db.settlements.some((s) => s.ownerId === ownerId && s.periodEnd >= periodEnd);
}

/** The default period to settle: the current calendar month. */
export function defaultSettlementPeriod(): { from: string; to: string } {
  const now = new Date(db.NOW_ISO);
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** A wide period covering all seed data (used where all-time totals must reconcile). */
export function fullSettlementPeriod(): { from: string; to: string } {
  return { from: "2025-01-01", to: db.NOW_ISO.slice(0, 10) };
}
