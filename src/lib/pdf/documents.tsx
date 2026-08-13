/* eslint-disable jsx-a11y/alt-text -- @react-pdf <Image> has no alt prop */
import * as React from "react";
import { Document, Page, View, Text, Image, StyleSheet, type DocumentProps } from "@react-pdf/renderer";
import { PDF } from "./theme";

const c = PDF.colors;

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 64, paddingHorizontal: 40, fontSize: 10, color: c.text, fontFamily: "Helvetica" },
  // header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  logo: { width: 130, height: 30, objectFit: "contain" },
  company: { textAlign: "right", fontSize: 8, color: c.muted, lineHeight: 1.4 },
  companyName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: c.text },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: c.text, marginTop: 14, letterSpacing: 1 },
  accent: { height: 3, width: 64, backgroundColor: c.primary, marginTop: 4, marginBottom: 16 },
  // meta blocks
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  block: { flexDirection: "column", maxWidth: 240 },
  label: { fontSize: 7.5, color: c.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  strong: { fontFamily: "Helvetica-Bold", color: c.text },
  metaLine: { marginBottom: 2 },
  // table
  table: { marginTop: 6, borderWidth: 1, borderColor: c.border, borderRadius: 2 },
  th: { flexDirection: "row", backgroundColor: c.headerBg, color: c.white, paddingVertical: 6, paddingHorizontal: 8, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: c.border },
  trAlt: { backgroundColor: c.rowAlt },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  // totals
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalsLabel: { width: 120, textAlign: "right", paddingRight: 10, color: c.muted },
  totalsValue: { width: 110, textAlign: "right" },
  grandRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.primary },
  grandLabel: { width: 120, textAlign: "right", paddingRight: 10, fontFamily: "Helvetica-Bold", color: c.text },
  grandValue: { width: 110, textAlign: "right", fontFamily: "Helvetica-Bold", color: c.primary, fontSize: 12 },
  // note box
  note: { marginTop: 20, borderWidth: 1, borderColor: c.border, borderRadius: 2, padding: 10, backgroundColor: c.bg },
  noteTitle: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  // footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.muted },
  tagline: { color: c.primary, fontFamily: "Helvetica-Bold" },
  // stamp
  stamp: { position: "absolute", top: 150, right: 60, borderWidth: 3, borderColor: c.primary, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 18, transform: "rotate(-14deg)" },
  stampText: { color: c.primary, fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  // clauses / signatures
  clauseH: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 16, marginBottom: 6 },
  clause: { marginBottom: 6, lineHeight: 1.5 },
  clauseNum: { fontFamily: "Helvetica-Bold" },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  sigCol: { width: 210 },
  sigLine: { borderTopWidth: 1, borderTopColor: c.text, marginTop: 34, paddingTop: 4, fontSize: 8, color: c.muted },
});

function money(n: number) { return `UGX ${Math.round(n).toLocaleString("en-UG")}`; }

function Header({ title }: { title: string }) {
  return (
    <View>
      <View style={s.header}>
        <Image style={s.logo} src={PDF.logo} />
        <View style={s.company}>
          <Text style={s.companyName}>{PDF.company.name}</Text>
          <Text>{PDF.company.address}</Text>
          <Text>{PDF.company.phone} · {PDF.company.email}</Text>
        </View>
      </View>
      <Text style={s.title}>{title}</Text>
      <View style={s.accent} />
    </View>
  );
}

function Footer({ note }: { note?: string }) {
  return (
    <View style={s.footer} fixed>
      <View>
        <Text style={s.tagline}>{PDF.company.tagline}</Text>
        <Text>{PDF.company.reg}{note ? ` · ${note}` : ""}</Text>
      </View>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

/* --------------------------------------------------------------- invoice */

export interface InvoicePdfData {
  number: string; issued: string; due: string; status: string;
  tenantName: string; unitLabel: string; propertyName: string; email?: string; phone?: string;
  lineDesc: string; period: string; amount: number; kind: string;
}

export function InvoiceDoc({ d }: { d: InvoicePdfData }) {
  return (
    <Document title={`Invoice ${d.number}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="INVOICE" />
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.strong}>{d.tenantName}</Text>
            <Text style={s.metaLine}>Unit {d.unitLabel}, {d.propertyName}</Text>
            {d.email ? <Text style={s.metaLine}>{d.email}</Text> : null}
            {d.phone ? <Text style={s.metaLine}>{d.phone}</Text> : null}
          </View>
          <View style={[s.block, { textAlign: "right" }]}>
            <Text style={s.label}>Invoice</Text>
            <Text style={s.strong}>{d.number}</Text>
            <Text style={s.metaLine}>Issued: {d.issued}</Text>
            <Text style={s.metaLine}>Due: {d.due}</Text>
            <Text style={s.metaLine}>Status: {d.status}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cell}>Description</Text>
            <Text style={{ width: 110 }}>Period</Text>
            <Text style={{ width: 90, textAlign: "right" }}>Amount</Text>
          </View>
          <View style={s.tr}>
            <Text style={s.cell}>{d.lineDesc}</Text>
            <Text style={{ width: 110 }}>{d.period}</Text>
            <Text style={{ width: 90, textAlign: "right" }}>{money(d.amount)}</Text>
          </View>
        </View>

        <View style={s.totalsRow}><Text style={s.totalsLabel}>Subtotal</Text><Text style={s.totalsValue}>{money(d.amount)}</Text></View>
        <View style={s.grandRow}><Text style={s.grandLabel}>Total due</Text><Text style={s.grandValue}>{money(d.amount)}</Text></View>

        <View style={s.note}>
          <Text style={s.noteTitle}>Payment instructions</Text>
          <Text>Pay via Flutterwave or Mobile Money from your tenant portal, or bank transfer to
            Nexora Property Management Ltd, Stanbic Bank Uganda ••3421 (SWIFT SBICUGKX). Quote reference {d.number}.</Text>
        </View>

        <Footer note="Thank you for your prompt payment" />
      </Page>
    </Document>
  );
}

/* --------------------------------------------------------------- receipt */

export interface ReceiptPdfData {
  receiptNo: string; date: string; method: string; reference: string;
  tenantName: string; unitLabel: string; propertyName: string; amount: number; balance: number;
}

export function ReceiptDoc({ d }: { d: ReceiptPdfData }) {
  return (
    <Document title={`Receipt ${d.receiptNo}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="PAYMENT RECEIPT" />
        <View style={s.stamp}><Text style={s.stampText}>PAID</Text></View>
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Received from</Text>
            <Text style={s.strong}>{d.tenantName}</Text>
            <Text style={s.metaLine}>Unit {d.unitLabel}, {d.propertyName}</Text>
          </View>
          <View style={[s.block, { textAlign: "right" }]}>
            <Text style={s.label}>Receipt</Text>
            <Text style={s.strong}>{d.receiptNo}</Text>
            <Text style={s.metaLine}>Date: {d.date}</Text>
            <Text style={s.metaLine}>Method: {d.method}</Text>
            <Text style={s.metaLine}>Ref: {d.reference}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}><Text style={s.cell}>Description</Text><Text style={{ width: 110, textAlign: "right" }}>Amount paid</Text><Text style={{ width: 110, textAlign: "right" }}>Balance</Text></View>
          <View style={s.tr}><Text style={s.cell}>Rent payment — Unit {d.unitLabel}, {d.propertyName}</Text><Text style={{ width: 110, textAlign: "right" }}>{money(d.amount)}</Text><Text style={{ width: 110, textAlign: "right" }}>{money(d.balance)}</Text></View>
        </View>

        <View style={s.grandRow}><Text style={s.grandLabel}>Amount paid</Text><Text style={s.grandValue}>{money(d.amount)}</Text></View>

        <Footer note="This receipt confirms payment received" />
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------ owner statement */

export interface StatementRow { property: string; units: number; collected: number; expenses: number; fee: number; net: number }
export interface StatementPdfData {
  ownerName: string; email: string; period: string; propertiesCount: number; unitsCount: number;
  rows: StatementRow[];
  totals: { collected: number; expenses: number; fee: number; net: number };
  disbursement: { amount: number; date: string; account: string; ref: string };
  agreement?: { ref: string; basis: string; commissionCalc: string };
}

export function StatementDoc({ d }: { d: StatementPdfData }) {
  return (
    <Document title={`Owner Statement ${d.period}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="OWNER STATEMENT" />
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Owner</Text>
            <Text style={s.strong}>{d.ownerName}</Text>
            <Text style={s.metaLine}>{d.email}</Text>
            <Text style={s.metaLine}>{d.propertiesCount} properties · {d.unitsCount} units</Text>
          </View>
          <View style={[s.block, { textAlign: "right" }]}>
            <Text style={s.label}>Statement period</Text>
            <Text style={s.strong}>{d.period}</Text>
            {d.agreement && <Text style={s.metaLine}>Agreement {d.agreement.ref}</Text>}
            {d.agreement && <Text style={s.metaLine}>{d.agreement.basis}</Text>}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={{ flex: 1.6 }}>Property</Text>
            <Text style={{ width: 40, textAlign: "right" }}>Units</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Collected</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Expenses</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Fee</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Net</Text>
          </View>
          {d.rows.map((r, i) => (
            <View key={r.property} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr}>
              <Text style={{ flex: 1.6 }}>{r.property}</Text>
              <Text style={{ width: 40, textAlign: "right" }}>{r.units}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{money(r.collected)}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{money(r.expenses)}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{money(r.fee)}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{money(r.net)}</Text>
            </View>
          ))}
          <View style={[s.tr, { backgroundColor: c.headerBg }]}>
            <Text style={{ flex: 1.6, color: c.white, fontFamily: "Helvetica-Bold" }}>Portfolio total</Text>
            <Text style={{ width: 40 }} />
            <Text style={{ flex: 1, textAlign: "right", color: c.white, fontFamily: "Helvetica-Bold" }}>{money(d.totals.collected)}</Text>
            <Text style={{ flex: 1, textAlign: "right", color: c.white, fontFamily: "Helvetica-Bold" }}>{money(d.totals.expenses)}</Text>
            <Text style={{ flex: 1, textAlign: "right", color: c.white, fontFamily: "Helvetica-Bold" }}>{money(d.totals.fee)}</Text>
            <Text style={{ flex: 1, textAlign: "right", color: c.white, fontFamily: "Helvetica-Bold" }}>{money(d.totals.net)}</Text>
          </View>
        </View>

        <View style={s.note}>
          <Text style={s.noteTitle}>Disbursement</Text>
          {d.agreement && <Text>Management commission: {d.agreement.commissionCalc}</Text>}
          <Text>Net amount of {money(d.disbursement.amount)} disbursed on {d.disbursement.date} to account {d.disbursement.account}. Reference {d.disbursement.ref}.</Text>
        </View>

        <Footer note="This statement is auto-generated by Nexora Property Management" />
      </Page>
    </Document>
  );
}

/* -------------------------------------------------------- lease agreement */

export interface LeasePdfData {
  ref: string; tenantName: string; propertyName: string; unitLabel: string; unitType: string; sizeSqm: number; floor: number;
  start: string; end: string; frequency: string; rent: number; deposit: number; dueDay: number; grace: number;
}

const CLAUSES = [
  "Payment obligations: The Tenant shall pay the monthly rent in advance on or before the due date. Persistent late payment beyond the grace period constitutes a breach of this agreement.",
  "Maintenance responsibilities: The Manager shall maintain the structure and common areas. The Tenant shall keep the unit in good condition and report faults promptly through the resident portal.",
  "Use of premises: The unit shall be used for lawful residential purposes only and shall not be sublet without the Manager's written consent.",
  "Termination conditions: Either party may terminate this agreement by giving the notice period below. The security deposit is refundable subject to the condition of the unit at hand-over.",
  "Notice period: A minimum of one (1) calendar month written notice is required from either party prior to termination.",
  "Governing law: This agreement is governed by the laws of the Republic of Uganda and any dispute shall be resolved under its jurisdiction.",
];

export function LeaseDoc({ d }: { d: LeasePdfData }) {
  return (
    <Document title={`Lease Agreement ${d.ref}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="LEASE AGREEMENT" />
        <Text style={{ marginBottom: 10, lineHeight: 1.5 }}>
          This Lease Agreement (Ref: <Text style={s.strong}>{d.ref}</Text>) is made BETWEEN{" "}
          <Text style={s.strong}>Nexora Property Management Ltd</Text> (the “Manager”) AND{" "}
          <Text style={s.strong}>{d.tenantName}</Text> (the “Tenant”).
        </Text>

        <Text style={s.clauseH}>Property &amp; unit</Text>
        <View style={s.table}>
          <View style={s.tr}><Text style={s.cell}>Property</Text><Text style={s.cellRight}>{d.propertyName}</Text></View>
          <View style={[s.tr, s.trAlt]}><Text style={s.cell}>Unit</Text><Text style={s.cellRight}>{d.unitLabel} · {d.unitType}</Text></View>
          <View style={s.tr}><Text style={s.cell}>Floor / size</Text><Text style={s.cellRight}>Floor {d.floor} · {d.sizeSqm} m²</Text></View>
        </View>

        <Text style={s.clauseH}>Lease terms</Text>
        <View style={s.table}>
          <View style={s.tr}><Text style={s.cell}>Commencement</Text><Text style={s.cellRight}>{d.start}</Text></View>
          <View style={[s.tr, s.trAlt]}><Text style={s.cell}>Expiry</Text><Text style={s.cellRight}>{d.end}</Text></View>
          <View style={s.tr}><Text style={s.cell}>Type</Text><Text style={s.cellRight}>{d.frequency}</Text></View>
          <View style={[s.tr, s.trAlt]}><Text style={s.cell}>Monthly rent</Text><Text style={s.cellRight}>{money(d.rent)}</Text></View>
          <View style={s.tr}><Text style={s.cell}>Security deposit</Text><Text style={s.cellRight}>{money(d.deposit)}</Text></View>
          <View style={[s.tr, s.trAlt]}><Text style={s.cell}>Payment due day / grace</Text><Text style={s.cellRight}>Day {d.dueDay} · {d.grace} days</Text></View>
        </View>

        <Text style={s.clauseH}>Standard clauses</Text>
        {CLAUSES.map((cl, i) => (
          <Text key={i} style={s.clause}><Text style={s.clauseNum}>{i + 1}. </Text>{cl}</Text>
        ))}

        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <Text style={s.strong}>For Nexora Property Management</Text>
            <Text style={s.sigLine}>Name / Title / Signature</Text>
            <Text style={{ fontSize: 8, color: c.muted, marginTop: 10 }}>Date: ____________________</Text>
          </View>
          <View style={s.sigCol}>
            <Text style={s.strong}>Tenant</Text>
            <Text style={s.sigLine}>{d.tenantName} / Signature</Text>
            <Text style={{ fontSize: 8, color: c.muted, marginTop: 10 }}>Date: ____________________</Text>
          </View>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}

/* -------------------------------------------------- deposit settlement */

export interface DepositSettlementPdfData {
  ref: string; date: string;
  tenantName: string; propertyName: string; unitLabel: string;
  leaseStart: string; leaseEnd: string; rent: number; deposit: number;
  inspection: { category: string; condition: string; cost: number; notes?: string }[];
  totalDamage: number; outstandingRent: number;
  refund: number; additionalOwed: number; outcome: string;
  note?: string;
}

export function DepositSettlementDoc({ d }: { d: DepositSettlementPdfData }) {
  const net = d.refund > 0 ? `${money(d.refund)} refund` : d.additionalOwed > 0 ? `${money(d.additionalOwed)} owed by tenant` : "No refund due";
  return (
    <Document title={`Deposit Settlement ${d.ref}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="DEPOSIT SETTLEMENT STATEMENT" />
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Tenant</Text>
            <Text style={[s.strong, s.metaLine]}>{d.tenantName}</Text>
            <Text style={s.label}>Property / Unit</Text>
            <Text style={s.metaLine}>{d.propertyName} · {d.unitLabel}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.label}>Statement ref</Text>
            <Text style={[s.strong, s.metaLine]}>{d.ref}</Text>
            <Text style={s.label}>Date</Text>
            <Text style={s.metaLine}>{d.date}</Text>
          </View>
        </View>

        <Text style={s.clauseH}>Lease summary</Text>
        <View style={s.table}>
          <View style={s.tr}><Text style={s.cell}>Term</Text><Text style={s.cellRight}>{d.leaseStart} → {d.leaseEnd}</Text></View>
          <View style={[s.tr, s.trAlt]}><Text style={s.cell}>Monthly rent</Text><Text style={s.cellRight}>{money(d.rent)}</Text></View>
          <View style={s.tr}><Text style={s.cell}>Security deposit</Text><Text style={s.cellRight}>{money(d.deposit)}</Text></View>
        </View>

        <Text style={s.clauseH}>Inspection summary</Text>
        <View style={s.table}>
          <View style={s.th}><Text style={s.cell}>Area</Text><Text style={s.cell}>Condition</Text><Text style={s.cellRight}>Repair cost</Text></View>
          {d.inspection.map((r, i) => (
            <View key={i} style={i % 2 ? [s.tr, s.trAlt] : s.tr}>
              <Text style={s.cell}>{r.category}{r.notes ? ` — ${r.notes}` : ""}</Text>
              <Text style={s.cell}>{r.condition}</Text>
              <Text style={s.cellRight}>{r.cost > 0 ? money(r.cost) : "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.clauseH}>Financial calculation</Text>
        <View style={s.totalsRow}><Text style={s.totalsLabel}>Security deposit</Text><Text style={s.totalsValue}>{money(d.deposit)}</Text></View>
        <View style={s.totalsRow}><Text style={s.totalsLabel}>Less: damage repairs</Text><Text style={s.totalsValue}>-{money(d.totalDamage)}</Text></View>
        <View style={s.totalsRow}><Text style={s.totalsLabel}>Less: outstanding rent</Text><Text style={s.totalsValue}>-{money(d.outstandingRent)}</Text></View>
        <View style={s.grandRow}><Text style={s.grandLabel}>{d.refund > 0 ? "Net refund" : d.additionalOwed > 0 ? "Amount owed" : "Net settlement"}</Text><Text style={s.grandValue}>{net}</Text></View>

        <View style={s.note}>
          <Text style={s.noteTitle}>Deposit outcome: {d.outcome}</Text>
          {d.note ? <Text>{d.note}</Text> : <Text>The above settlement has been assessed following the exit inspection of the unit.</Text>}
        </View>

        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <Text style={s.strong}>For Nexora Property Management</Text>
            <Text style={s.sigLine}>Name / Title / Signature</Text>
            <Text style={{ fontSize: 8, color: c.muted, marginTop: 10 }}>Date: ____________________</Text>
          </View>
          <View style={s.sigCol}>
            <Text style={s.strong}>Tenant</Text>
            <Text style={s.sigLine}>{d.tenantName} / Signature</Text>
            <Text style={{ fontSize: 8, color: c.muted, marginTop: 10 }}>Date: ____________________</Text>
          </View>
        </View>

        <Footer note="Deposit settlement statement — issued by Nexora Property Management" />
      </Page>
    </Document>
  );
}

/* -------------------------------------------------- settlement statement */

export interface SettlementStatementPdfData {
  ref: string; date: string; period: string;
  ownerName: string; agreementType: string; rate: string;
  rentItems: { tenant: string; unit: string; amount: number; date: string }[];
  grossRevenue: number;
  managementFee: number; feeMath: string;
  expenseItems: { property: string; category: string; amount: number }[];
  expenses: number; depositDeductions: number;
  netPayout: number;
  bankName: string; bankMasked: string; reference: string;
  processedOn: string;
}

export function SettlementStatementDoc({ d }: { d: SettlementStatementPdfData }) {
  return (
    <Document title={`Settlement Statement ${d.ref}`} author="Nexora Property Management">
      <Page size="A4" style={s.page}>
        <Header title="SETTLEMENT STATEMENT" />
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.label}>Owner</Text>
            <Text style={[s.strong, s.metaLine]}>{d.ownerName}</Text>
            <Text style={s.label}>Agreement</Text>
            <Text style={s.metaLine}>{d.agreementType} — {d.rate}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.label}>Statement ref</Text>
            <Text style={[s.strong, s.metaLine]}>{d.ref}</Text>
            <Text style={s.label}>Settlement period</Text>
            <Text style={s.metaLine}>{d.period}</Text>
            <Text style={s.label}>Date</Text>
            <Text style={s.metaLine}>{d.date}</Text>
          </View>
        </View>

        <Text style={s.clauseH}>Revenue — rent collected</Text>
        <View style={s.table}>
          <View style={s.th}><Text style={s.cell}>Tenant</Text><Text style={s.cell}>Unit</Text><Text style={s.cell}>Date</Text><Text style={s.cellRight}>Amount</Text></View>
          {d.rentItems.length === 0 ? (
            <View style={s.tr}><Text style={s.cell}>No rent collected in this period</Text></View>
          ) : d.rentItems.map((r, i) => (
            <View key={i} style={i % 2 ? [s.tr, s.trAlt] : s.tr}>
              <Text style={s.cell}>{r.tenant}</Text><Text style={s.cell}>{r.unit}</Text><Text style={s.cell}>{r.date}</Text><Text style={s.cellRight}>{money(r.amount)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.clauseH}>Deductions</Text>
        <View style={s.table}>
          <View style={s.tr}><Text style={s.cell}>Management fee — {d.feeMath}</Text><Text style={s.cellRight}>-{money(d.managementFee)}</Text></View>
          {d.expenseItems.map((e, i) => (
            <View key={i} style={[s.tr, s.trAlt]}><Text style={s.cell}>{e.property} — {e.category}</Text><Text style={s.cellRight}>-{money(e.amount)}</Text></View>
          ))}
          {d.depositDeductions > 0 && <View style={s.tr}><Text style={s.cell}>Deposit deductions</Text><Text style={s.cellRight}>-{money(d.depositDeductions)}</Text></View>}
        </View>

        <View style={s.totalsRow}><Text style={s.totalsLabel}>Gross revenue</Text><Text style={s.totalsValue}>{money(d.grossRevenue)}</Text></View>
        <View style={s.totalsRow}><Text style={s.totalsLabel}>Total deductions</Text><Text style={s.totalsValue}>-{money(d.managementFee + d.expenses + d.depositDeductions)}</Text></View>
        <View style={s.grandRow}><Text style={s.grandLabel}>Net payout</Text><Text style={s.grandValue}>{money(d.netPayout)}</Text></View>

        <View style={s.note}>
          <Text style={s.noteTitle}>Payout details</Text>
          <Text>Bank: {d.bankName} · Account: {d.bankMasked} · Reference: {d.reference}</Text>
          <Text>Status: Processed on {d.processedOn}</Text>
        </View>

        <Footer note="This statement is auto-generated by Nexora Property Management" />
      </Page>
    </Document>
  );
}

/* --------------------------------------------------------- dispatcher */

export type PdfPayload =
  | { kind: "invoice"; data: InvoicePdfData }
  | { kind: "receipt"; data: ReceiptPdfData }
  | { kind: "statement"; data: StatementPdfData }
  | { kind: "lease"; data: LeasePdfData }
  | { kind: "deposit"; data: DepositSettlementPdfData }
  | { kind: "settlement"; data: SettlementStatementPdfData };

export function renderDocument(p: PdfPayload): React.ReactElement<DocumentProps> {
  const el =
    p.kind === "invoice" ? <InvoiceDoc d={p.data} />
    : p.kind === "receipt" ? <ReceiptDoc d={p.data} />
    : p.kind === "statement" ? <StatementDoc d={p.data} />
    : p.kind === "deposit" ? <DepositSettlementDoc d={p.data} />
    : p.kind === "settlement" ? <SettlementStatementDoc d={p.data} />
    : <LeaseDoc d={p.data} />;
  return el as unknown as React.ReactElement<DocumentProps>;
}
