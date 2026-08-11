/**
 * Build branded-PDF payloads from real store data. Type-only import of the PDF
 * data shapes (no @react-pdf pulled in here), so pages can import these builders
 * freely. Each returns { payload, filename } for downloadPdf().
 */
import * as db from "@/lib/mock/db";
import type { Invoice, Payment, Lease } from "@/lib/mock/types";
import type { InvoicePdfData, ReceiptPdfData, StatementPdfData, LeasePdfData, PdfPayload } from "./documents";
import { slugFile } from "./download";
import { formatDate, formatUGX } from "@/lib/format";
import { commissionForAgreement, agreementRateLabel, CONTRACT_TYPE_LABEL } from "@/lib/api/agreements";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pName = (id: string) => db.properties.find((p) => p.id === id)?.name ?? "—";
const uLabel = (id?: string) => db.units.find((u) => u.id === id)?.label ?? "—";
const monthOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export function invoicePdf(inv: Invoice): { payload: PdfPayload; filename: string } {
  const tenant = db.tenants.find((t) => t.id === inv.tenantId);
  const unit = db.units.find((u) => u.id === tenant?.unitId);
  const data: InvoicePdfData = {
    number: inv.number, issued: formatDate(inv.issued), due: formatDate(inv.due), status: cap(inv.status),
    tenantName: tenant?.name ?? "Tenant", unitLabel: unit?.label ?? uLabel(tenant?.unitId), propertyName: pName(inv.propertyId),
    email: tenant?.email, phone: tenant?.phone,
    lineDesc: `${cap(inv.kind)} — Unit ${unit?.label ?? ""}, ${pName(inv.propertyId)}`.trim(),
    period: monthOf(inv.issued), amount: inv.amount, kind: inv.kind,
  };
  return { payload: { kind: "invoice", data }, filename: `Nexora-Invoice-${inv.number}-${slugFile(monthOf(inv.issued))}` };
}

export function receiptPdf(pay: Payment): { payload: PdfPayload; filename: string } {
  const tenant = db.tenants.find((t) => t.id === pay.tenantId);
  const unit = db.units.find((u) => u.id === tenant?.unitId);
  const outstanding = db.invoices.filter((i) => i.tenantId === pay.tenantId && i.status !== "paid").reduce((s, i) => s + (i.amount - i.paid), 0);
  const data: ReceiptPdfData = {
    receiptNo: `RCP-${pay.reference}`, date: formatDate(pay.date), method: cap(pay.method.replace("_", " ")), reference: pay.reference,
    tenantName: tenant?.name ?? "Tenant", unitLabel: unit?.label ?? uLabel(tenant?.unitId), propertyName: pName(pay.propertyId),
    amount: pay.amount, balance: outstanding,
  };
  return { payload: { kind: "receipt", data }, filename: `Nexora-Receipt-${pay.reference}` };
}

export function leasePdf(lease: Lease): { payload: PdfPayload; filename: string } {
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  const unit = db.units.find((u) => u.id === lease.unitId);
  const ref = `LSE-${lease.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
  const data: LeasePdfData = {
    ref, tenantName: tenant?.name ?? "Tenant", propertyName: pName(lease.propertyId), unitLabel: unit?.label ?? "—",
    unitType: unit?.type ?? "—", sizeSqm: unit?.sizeSqm ?? 0, floor: unit?.floor ?? 0,
    start: formatDate(lease.start), end: formatDate(lease.end), frequency: cap(lease.frequency),
    rent: lease.rent, deposit: lease.deposit, dueDay: lease.dueDay ?? 5, grace: lease.gracePeriod ?? 5,
  };
  return { payload: { kind: "lease", data }, filename: `Nexora-Lease-${ref}` };
}

/** Lease PDF for the most relevant lease in a property (owner documents view). */
export function leasePdfForProperty(propertyId: string): { payload: PdfPayload; filename: string } | null {
  const lease = db.leases.find((l) => l.propertyId === propertyId && l.status !== "terminated") ?? db.leases.find((l) => l.propertyId === propertyId);
  return lease ? leasePdf(lease) : null;
}

export function statementPdf(ownerId: string, period?: string): { payload: PdfPayload; filename: string } {
  const owner = db.owners.find((o) => o.id === ownerId);
  const properties = db.properties.filter((p) => owner?.propertyIds.includes(p.id));
  // Commission is driven entirely by the owner's management agreement — no
  // hardcoded rate. The effective rate spreads the agreement's total commission
  // proportionally across properties so per-row fees sum to the true total.
  const agreement = db.getAgreementForOwner(ownerId);
  const totalCollected = properties.reduce((s, p) => s + p.monthlyRevenue, 0);
  const totalCommission = agreement ? commissionForAgreement(agreement, totalCollected) : 0;
  const effRate = totalCollected > 0 ? totalCommission / totalCollected : 0;
  const rows = properties.map((p) => {
    const collected = p.monthlyRevenue;
    const fee = Math.round(collected * effRate);
    const expenses = db.expenses.filter((e) => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { property: p.name, units: p.units, collected, expenses, fee, net: collected - fee - expenses };
  });
  const totals = rows.reduce((a, r) => ({ collected: a.collected + r.collected, expenses: a.expenses + r.expenses, fee: a.fee + r.fee, net: a.net + r.net }), { collected: 0, expenses: 0, fee: 0, net: 0 });
  const acct = agreement?.payoutAccountNumber || owner?.accountNumber;
  const per = period ?? monthOf(db.NOW_ISO);
  const data: StatementPdfData = {
    ownerName: owner?.name ?? "Owner", email: owner?.email ?? "", period: per,
    propertiesCount: properties.length, unitsCount: properties.reduce((s, p) => s + p.units, 0),
    rows, totals,
    disbursement: { amount: totals.net, date: "5th of the month", account: acct ? `••${acct.slice(-4)}` : "—", ref: `DSB-${slugFile(per).slice(0, 6).toUpperCase()}` },
    agreement: agreement
      ? {
          ref: `AGR-${agreement.id.replace(/\D/g, "").slice(-6).padStart(6, "0") || agreement.id.slice(-6).toUpperCase()}`,
          basis: `${CONTRACT_TYPE_LABEL[agreement.contractType]} — ${agreementRateLabel(agreement)}`,
          commissionCalc: `${CONTRACT_TYPE_LABEL[agreement.contractType]} (${agreementRateLabel(agreement)}) on ${formatUGX(totalCollected)} = ${formatUGX(totalCommission)}`,
        }
      : undefined,
  };
  return { payload: { kind: "statement", data }, filename: `Nexora-Statement-${slugFile(owner?.name ?? "Owner")}-${slugFile(per)}` };
}
