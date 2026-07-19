/**
 * Build branded-PDF payloads from real store data. Type-only import of the PDF
 * data shapes (no @react-pdf pulled in here), so pages can import these builders
 * freely. Each returns { payload, filename } for downloadPdf().
 */
import * as db from "@/lib/mock/db";
import type { Invoice, Payment, Lease } from "@/lib/mock/types";
import type { InvoicePdfData, ReceiptPdfData, StatementPdfData, LeasePdfData, PdfPayload } from "./documents";
import { slugFile } from "./download";
import { formatDate } from "@/lib/format";

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

const FEE_RATE = 0.08;
export function statementPdf(ownerId: string, period?: string): { payload: PdfPayload; filename: string } {
  const owner = db.owners.find((o) => o.id === ownerId);
  const properties = db.properties.filter((p) => owner?.propertyIds.includes(p.id));
  const rows = properties.map((p) => {
    const collected = p.monthlyRevenue;
    const fee = Math.round(collected * FEE_RATE);
    const expenses = db.expenses.filter((e) => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { property: p.name, units: p.units, collected, expenses, fee, net: collected - fee - expenses };
  });
  const totals = rows.reduce((a, r) => ({ collected: a.collected + r.collected, expenses: a.expenses + r.expenses, fee: a.fee + r.fee, net: a.net + r.net }), { collected: 0, expenses: 0, fee: 0, net: 0 });
  const bank = db.bankAccounts.find((b) => b.primary) ?? db.bankAccounts[0];
  const per = period ?? monthOf(db.NOW_ISO);
  const data: StatementPdfData = {
    ownerName: owner?.name ?? "Owner", email: owner?.email ?? "", period: per,
    propertiesCount: properties.length, unitsCount: properties.reduce((s, p) => s + p.units, 0),
    rows, totals,
    disbursement: { amount: totals.net, date: "5th of the month", account: bank ? `••${bank.accountNumber.slice(-4)}` : "—", ref: `DSB-${slugFile(per).slice(0, 6).toUpperCase()}` },
  };
  return { payload: { kind: "statement", data }, filename: `Nexora-Statement-${slugFile(owner?.name ?? "Owner")}-${slugFile(per)}` };
}
