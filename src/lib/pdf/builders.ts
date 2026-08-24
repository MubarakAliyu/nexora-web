/**
 * Build branded-PDF payloads from real store data. Type-only import of the PDF
 * data shapes (no @react-pdf pulled in here), so pages can import these builders
 * freely. Each returns { payload, filename } for downloadPdf().
 */
import * as db from "@/lib/mock/db";
import type { Invoice, Payment, Lease } from "@/lib/mock/types";
import type { InvoicePdfData, ReceiptPdfData, StatementPdfData, LeasePdfData, DepositSettlementPdfData, SettlementStatementPdfData, ServiceInvoicePdfData, MaintenanceInvoicePdfData, PdfPayload } from "./documents";
import { computeOwnerSettlement } from "@/lib/api/settlement";
import type { SettlementRecord } from "@/lib/mock/types";
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

/** Service invoice / receipt — priced from the on-site assessment, never a rate card. */
export function serviceInvoicePdf(bookingId: string, mode: "invoice" | "receipt" = "invoice"): { payload: PdfPayload; filename: string } {
  const sb = db.serviceBookings.find((b) => b.id === bookingId);
  if (!sb) throw new Error("Service booking not found");
  const number = sb.invoiceNumber ?? sb.reference.replace("NX-SV-", "INV-SV-");
  const data: ServiceInvoicePdfData = {
    mode,
    number: mode === "receipt" ? number.replace("INV-", "RCP-") : number,
    bookingRef: sb.reference,
    issued: formatDate(sb.invoiceGeneratedAt ?? sb.createdAt),
    due: sb.invoiceDueDate ? formatDate(sb.invoiceDueDate) : undefined,
    clientName: sb.name, email: sb.email, phone: sb.phone, address: sb.location,
    serviceType: sb.kind === "cleaning" ? "Cleaning" : "Home & Lifestyle",
    category: sb.category,
    scope: sb.assessmentScope ?? "Scope pending assessment",
    assessedBy: sb.assessedBy,
    assessedAt: sb.assessedAt ? formatDate(sb.assessedAt) : undefined,
    amount: sb.invoiceAmount ?? sb.assessedAmount ?? 0,
    paidAmount: sb.paidAmount,
    paymentMethod: sb.paymentMethod ? cap(sb.paymentMethod.replace(/_/g, " ")) : undefined,
    paymentReference: sb.paymentReference,
    paidAt: sb.paidAt ? formatDate(sb.paidAt) : undefined,
  };
  return {
    payload: { kind: "service-invoice", data },
    filename: `Nexora-${mode === "receipt" ? "Service-Receipt" : "Service-Invoice"}-${data.number}`,
  };
}

/** Maintenance invoice for a tenant-liable ticket (E4). */
export function maintenanceInvoicePdf(ticketId: string): { payload: PdfPayload; filename: string } {
  const t = db.tickets.find((x) => x.id === ticketId);
  if (!t) throw new Error("Ticket not found");
  const tenant = db.tenants.find((x) => x.id === t.tenantId);
  const paid = t.paymentStatus === "paid";
  const data: MaintenanceInvoicePdfData = {
    number: t.invoiceNumber ?? `INV-${t.ref}`,
    ticketRef: t.ref,
    issued: formatDate(t.invoiceGeneratedAt ?? t.closedAt ?? t.createdAt),
    due: t.invoiceDueDate ? formatDate(t.invoiceDueDate) : "On receipt",
    status: paid ? "Paid" : "Awaiting payment",
    tenantName: tenant?.name ?? "Tenant",
    unitLabel: uLabel(t.unitId),
    propertyName: pName(t.propertyId),
    issue: t.title,
    workPerformed: t.resolution ?? "-",
    labour: t.labourCost ?? 0,
    materials: t.materialsCost ?? 0,
    total: t.invoiceAmount ?? t.cost ?? 0,
    paid,
    paymentReference: t.paymentReference,
    paidAt: t.paidAt ? formatDate(t.paidAt) : undefined,
  };
  return {
    payload: { kind: "maintenance-invoice", data },
    filename: `Nexora-Maintenance-Invoice-${slugFile(data.number)}`,
  };
}

export interface DepositSettlementInput {
  leaseId: string;
  inspection: { category: string; condition: string; cost: number; notes?: string }[];
  totalDamage: number;
  outstandingRent: number;
  refund: number;
  additionalOwed: number;
  outcome: string;
  note?: string;
}

export function depositSettlementPdf(input: DepositSettlementInput): { payload: PdfPayload; filename: string } {
  const lease = db.leases.find((l) => l.id === input.leaseId);
  const tenant = db.tenants.find((t) => t.id === lease?.tenantId);
  const unit = db.units.find((u) => u.id === lease?.unitId);
  const ref = `DEP-${(lease?.id ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "000000"}`;
  const data: DepositSettlementPdfData = {
    ref, date: formatDate(db.NOW_ISO),
    tenantName: tenant?.name ?? "Tenant", propertyName: pName(lease?.propertyId ?? ""), unitLabel: unit?.label ?? "—",
    leaseStart: formatDate(lease?.start ?? db.NOW_ISO), leaseEnd: formatDate(lease?.end ?? db.NOW_ISO),
    rent: lease?.rent ?? 0, deposit: lease?.deposit ?? 0,
    inspection: input.inspection,
    totalDamage: input.totalDamage, outstandingRent: input.outstandingRent,
    refund: input.refund, additionalOwed: input.additionalOwed, outcome: input.outcome, note: input.note,
  };
  return { payload: { kind: "deposit", data }, filename: `Nexora-Deposit-Settlement-${ref}` };
}

export function settlementStatementPdf(rec: SettlementRecord): { payload: PdfPayload; filename: string } {
  const c = computeOwnerSettlement(rec.ownerId, rec.periodStart, rec.periodEnd);
  const data: SettlementStatementPdfData = {
    ref: `STL-${rec.id.replace(/\D/g, "").slice(-6)}`, date: formatDate(rec.processedAt), period: rec.period,
    ownerName: rec.ownerName, agreementType: rec.agreementType ? CONTRACT_TYPE_LABEL[rec.agreementType] : "—", rate: rec.agreementRate ?? "—",
    rentItems: c.rentPayments.map((r) => ({ tenant: r.label, unit: r.sub, amount: r.amount, date: r.date ? formatDate(r.date) : "" })),
    grossRevenue: rec.grossRevenue,
    managementFee: rec.managementFee, feeMath: c.feeMath,
    expenseItems: c.expenseItems.map((e) => ({ property: e.label, category: e.sub, amount: e.amount })),
    expenses: rec.expenses, depositDeductions: rec.depositDeductions,
    netPayout: rec.netPayout,
    bankName: c.bankName ?? "—", bankMasked: rec.bankMasked, reference: `STL-${rec.id.slice(-6).toUpperCase()}`,
    processedOn: formatDate(rec.processedAt),
  };
  return { payload: { kind: "settlement", data }, filename: `Nexora-Settlement-${slugFile(rec.ownerName)}-${slugFile(rec.period)}` };
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
