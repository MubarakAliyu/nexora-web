/**
 * Financial Overview aggregation — records only, no money movement (third-party
 * gateways do that). Every owner-facing figure derives from the management
 * agreement; nothing is hardcoded.
 */

import * as db from "@/lib/mock/db";
import {
  getAgreementForOwner, commissionForAgreement, agreementFinancials, agreementRateLabel,
  ownerGrossRevenue, ownerExpenses, CONTRACT_TYPE_LABEL,
} from "@/lib/api/agreements";
import { hasSettlementForPeriod, defaultSettlementPeriod } from "@/lib/api/settlement";
import { serviceRevenueCollected } from "@/lib/api/service-lifecycle";
import type { ContractType } from "@/lib/mock/types";

const mDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const NOW = new Date(db.NOW_ISO);

/**
 * E3: there is deliberately NO service rate card. A service booking's value comes
 * only from its on-site assessment → invoice → payment chain, so revenue is read
 * from what was actually invoiced/collected on the booking itself.
 */
export function serviceBookingAmount(sb: { paidAmount?: number; invoiceAmount?: number; assessedAmount?: number }): number {
  return sb.paidAmount ?? sb.invoiceAmount ?? sb.assessedAmount ?? 0;
}

const monthOf = (iso: string) => iso.slice(0, 7);
const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const daysAgoIso = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

/* ---------------------------------------------------------------- KPIs */

export interface FinancialKpis {
  totalRevenue: number;
  totalSettlements: number;
  pendingPayouts: number;
  nexoraEarnings: number;
}

export async function getFinancialKpis(scope?: { forceError?: boolean }): Promise<FinancialKpis> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load financials.");
  const rentRevenue = db.payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const serviceRevenue = serviceRevenueCollected();
  let totalSettlements = 0, pendingPayouts = 0, nexoraEarnings = 0;
  for (const owner of db.owners) {
    const a = getAgreementForOwner(owner.id);
    if (!a) continue;
    const f = agreementFinancials(a);
    totalSettlements += f.settledToOwner;
    pendingPayouts += f.pending;
    nexoraEarnings += f.commissionEarned;
  }
  // Processed settlements (Rev D) move value from pending → settled.
  const processed = db.settlements.reduce((s, r) => s + r.netPayout, 0);
  totalSettlements += processed;
  pendingPayouts = Math.max(0, pendingPayouts - processed);
  return { totalRevenue: rentRevenue + serviceRevenue, totalSettlements, pendingPayouts, nexoraEarnings };
}

/* ------------------------------------------------------ revenue breakdown */

export interface RevenuePoint { label: string; rent: number; service: number; }

export async function getRevenueBreakdown(scope?: { forceError?: boolean }): Promise<RevenuePoint[]> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load chart.");
  // Distribute completed rent payments + service bookings across the last 6 months.
  const rentByMonth = new Map<string, number>();
  db.payments.filter((p) => p.status === "completed").forEach((p) => {
    const m = monthOf(p.date);
    rentByMonth.set(m, (rentByMonth.get(m) ?? 0) + p.amount);
  });
  const svcByMonth = new Map<string, number>();
  db.serviceBookings.filter((s) => s.status !== "cancelled").forEach((s) => {
    const m = monthOf(s.createdAt);
    svcByMonth.set(m, (svcByMonth.get(m) ?? 0) + serviceBookingAmount(s));
  });
  const sortedRent = [...rentByMonth.entries()].sort();
  const sortedSvc = [...svcByMonth.entries()].sort();
  // Map the most recent 6 buckets onto readable month labels.
  return MONTHS.map((label, i) => ({
    label,
    rent: Math.round((sortedRent[i]?.[1] ?? sortedRent[sortedRent.length - 1]?.[1] ?? 0) / 1_000_000),
    service: Math.round((sortedSvc[i]?.[1] ?? sortedSvc[sortedSvc.length - 1]?.[1] ?? 0) / 1_000_000),
  }));
}

/* ------------------------------------------------- transaction history */

export type TxKind = "Rent Payment" | "Service Payment" | "Owner Settlement" | "Commission" | "Expense" | "Refund";
export interface FinanceTxRow {
  id: string;
  date: string;
  kind: TxKind;
  description: string;
  amount: number;
  direction: "in" | "out";
  status: "completed" | "pending" | "failed";
  reference: string;
  entity?: { label: string; href: string };
  propertyId?: string;
  ownerId?: string;
}

export interface FinanceTxFilters {
  kind?: string;
  status?: string;
  from?: string;
  to?: string;
  ownerId?: string;
  propertyId?: string;
  q?: string;
  forceError?: boolean;
}

function allTransactions(): FinanceTxRow[] {
  const rows: FinanceTxRow[] = [];

  db.payments.forEach((p) => {
    const tenant = db.tenants.find((t) => t.id === p.tenantId);
    const unit = db.units.find((u) => u.id === tenant?.unitId);
    rows.push({
      id: `tx_${p.id}`, date: p.date, kind: "Rent Payment",
      description: `Rent payment — ${tenant?.name ?? "tenant"}${unit ? `, Unit ${unit.label}` : ""}`,
      amount: p.amount, direction: "in", status: p.status, reference: p.reference,
      entity: tenant ? { label: tenant.name, href: `/admin/tenants/${tenant.id}` } : undefined,
      propertyId: p.propertyId,
    });
  });

  // E3: service revenue is REAL money — only invoiced/paid bookings appear, dated by
  // the payment (or invoice) rather than the booking, and linked to their source.
  db.serviceBookings.forEach((s) => {
    const amount = serviceBookingAmount(s);
    if (!amount) return; // not yet assessed → no revenue to report
    const settled = (s.paidAmount ?? 0) > 0;
    rows.push({
      id: `tx_${s.id}`, date: s.paidAt ?? s.invoiceGeneratedAt ?? s.createdAt, kind: "Service Payment",
      description: `${s.category} — ${s.name}`,
      amount, direction: "in",
      status: s.status === "cancelled" ? "failed" : settled ? "completed" : "pending",
      reference: s.paymentReference ?? s.invoiceNumber ?? s.reference,
      entity: { label: s.reference, href: `/admin/service-bookings?booking=${s.id}` },
    });
  });

  db.expenses.forEach((e) => {
    rows.push({
      id: `tx_${e.id}`, date: e.date, kind: "Expense",
      description: `${e.description}`,
      amount: e.amount, direction: "out",
      status: e.status === "approved" || e.status === "reimbursed" ? "completed" : "pending",
      reference: `EXP-${e.id.replace(/\D/g, "")}`, propertyId: e.propertyId,
    });
  });

  // Processed settlements (Rev D) — real ledger entries, outgoing.
  db.settlements.forEach((r) => {
    rows.push({
      id: `tx_${r.id}`, date: r.processedAt, kind: "Owner Settlement",
      description: `Settlement to ${r.ownerName} for ${r.period}`,
      amount: r.netPayout, direction: "out", status: "completed",
      reference: `STL-${r.id.slice(-6).toUpperCase()}`,
      entity: { label: r.ownerName, href: `/admin/owners/${r.ownerId}` }, ownerId: r.ownerId,
    });
  });

  // Owner settlements + Nexora commission, derived from each agreement.
  db.owners.forEach((owner) => {
    const a = getAgreementForOwner(owner.id);
    if (!a) return;
    const f = agreementFinancials(a);
    rows.push({
      id: `tx_settle_${owner.id}`, date: db.NOW_ISO, kind: "Owner Settlement",
      description: `Settlement — ${owner.name}`,
      amount: f.settledToOwner, direction: "out", status: "completed",
      reference: `DSB-${owner.id.slice(-4).toUpperCase()}`,
      entity: { label: owner.name, href: `/admin/owners/${owner.id}` }, ownerId: owner.id,
    });
    rows.push({
      id: `tx_comm_${owner.id}`, date: db.NOW_ISO, kind: "Commission",
      description: `Management commission — ${owner.name} (${agreementRateLabel(a)})`,
      amount: f.commissionEarned, direction: "in", status: "completed",
      reference: `COM-${owner.id.slice(-4).toUpperCase()}`,
      entity: { label: owner.name, href: `/admin/owners/${owner.id}` }, ownerId: owner.id,
    });
  });

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function listFinancialTransactions(filters?: FinanceTxFilters): Promise<FinanceTxRow[]> {
  await mDelay();
  if (filters?.forceError) throw new Error("Failed to load transactions.");
  const f = filters ?? {};
  let rows = allTransactions();
  if (f.kind && f.kind !== "all") rows = rows.filter((r) => r.kind === f.kind);
  if (f.status && f.status !== "all") rows = rows.filter((r) => r.status === f.status);
  if (f.ownerId && f.ownerId !== "all") rows = rows.filter((r) => r.ownerId === f.ownerId);
  if (f.propertyId && f.propertyId !== "all") rows = rows.filter((r) => r.propertyId === f.propertyId);
  if (f.from) rows = rows.filter((r) => r.date >= f.from!);
  if (f.to) rows = rows.filter((r) => r.date <= f.to! + "T23:59:59.999Z");
  if (f.q) { const s = f.q.toLowerCase(); rows = rows.filter((r) => r.description.toLowerCase().includes(s) || r.reference.toLowerCase().includes(s)); }
  return rows;
}

/* --------------------------------------------------- owner settlements */

export interface OwnerSettlement {
  ownerId: string;
  ownerName: string;
  hasAgreement: boolean;
  agreementType?: ContractType;
  agreementTypeLabel?: string;
  rateLabel?: string;
  gross: number;
  commission: number;
  expenses: number;
  net: number;
  commissionMath?: string;
  lastSettlement?: string;
  nextSettlement?: string;
  status: "settled" | "pending" | "overdue" | "no_agreement";
  payoutAccount?: string;
  settlementReady: boolean;
}

function nextSettlementDate(schedule: string): string {
  const d = new Date(NOW);
  if (schedule === "monthly") d.setMonth(d.getMonth() + 1);
  else if (schedule === "quarterly") d.setMonth(d.getMonth() + 3);
  else return "On demand";
  d.setDate(5);
  return d.toISOString();
}

export async function listOwnerSettlements(scope?: { forceError?: boolean }): Promise<OwnerSettlement[]> {
  await mDelay();
  if (scope?.forceError) throw new Error("Failed to load settlements.");
  return db.owners.map((owner) => {
    const a = getAgreementForOwner(owner.id);
    if (!a) {
      return { ownerId: owner.id, ownerName: owner.name, hasAgreement: false, gross: 0, commission: 0, expenses: 0, net: 0, status: "no_agreement" as const, settlementReady: false };
    }
    const gross = ownerGrossRevenue(owner.id);
    const commission = commissionForAgreement(a, gross);
    const expenses = ownerExpenses(owner.id);
    const acct = a.payoutAccountNumber || owner.accountNumber;
    const period = defaultSettlementPeriod();
    const settledThisPeriod = hasSettlementForPeriod(owner.id, period.to) || db.settlements.some((sr) => sr.ownerId === owner.id);
    const lastRec = db.settlements.find((sr) => sr.ownerId === owner.id);
    return {
      ownerId: owner.id, ownerName: owner.name, hasAgreement: true,
      agreementType: a.contractType, agreementTypeLabel: CONTRACT_TYPE_LABEL[a.contractType],
      rateLabel: agreementRateLabel(a),
      gross, commission, expenses, net: Math.max(0, gross - commission - expenses),
      commissionMath: a.contractType === "revenue_sharing"
        ? `${a.commissionPercentage}% of ${(gross / 1_000_000).toFixed(1)}M = ${(commission / 1_000_000).toFixed(1)}M`
        : `${agreementRateLabel(a)} → ${(commission / 1_000_000).toFixed(1)}M`,
      lastSettlement: lastRec?.processedAt ?? daysAgoIso(30),
      nextSettlement: nextSettlementDate(a.settlementSchedule),
      status: settledThisPeriod ? "settled" : "pending",
      payoutAccount: acct ? `•••• ${acct.slice(-4)}` : undefined,
      settlementReady: db.isSettlementReady(owner.id),
    };
  });
}
