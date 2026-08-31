"use client";

import * as React from "react";
import { Cash, Receipt, ChartLineUp, Download, CalendarMonth, FileLines, ChartPie, ClipboardList } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { BarChart, AreaChart } from "@/components/ui/chart";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SkeletonChart } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { downloadPdf } from "@/lib/pdf/download";
import { statementPdf, settlementStatementPdf } from "@/lib/pdf/builders";
import { generateCSV } from "@/lib/csv";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/format";
import { getOwnerFinancials, listProperties, type Scope } from "@/lib/api/admin";
import {
  computeOwnerSettlement, listSettlements, defaultSettlementPeriod,
  type SettlementRecord,
} from "@/lib/api/settlement";

export default function OwnerFinancialsPage() {
  const ownerId = useSession((s) => s.user?.ownerId) ?? "";
  const rev = useLive((s) => s.revision);
  const period0 = React.useMemo(() => defaultSettlementPeriod(), []);
  const [from, setFrom] = React.useState(period0.from);
  const [to, setTo] = React.useState(period0.to);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  // Reconciled settlement view over the selected period (same engine as admin).
  const calc = React.useMemo(
    () => (ownerId ? computeOwnerSettlement(ownerId, from, to) : null),
    [ownerId, from, to],
  );

  const fin = useAsync(() => getOwnerFinancials(ownerId, scope), [ownerId, scope]);
  const properties = useAsync(() => listProperties(undefined, { ownerId }), [ownerId, rev]);
  const settlements = useAsync(() => listSettlements(ownerId), [ownerId, rev]);

  const pendingRent = React.useMemo(() => {
    // invoiced but unpaid on this owner's properties — from getOwnerFinancials perProperty is net; use fin totals if present
    return fin.data ? Math.max(0, (fin.data.totals.revenue) - (calc?.grossRevenue ?? 0)) : 0;
  }, [fin.data, calc]);

  const hasSettlement = (settlements.data ?? []).length > 0;
  const lastSettlement = (settlements.data ?? [])[0];

  const settlementCols: Column<SettlementRecord>[] = [
    { key: "processedAt", header: "Date", sortable: true, render: (s) => formatDate(s.processedAt) },
    { key: "period", header: "Period", render: (s) => s.period },
    { key: "grossRevenue", header: "Gross", align: "right", render: (s) => formatCurrency(s.grossRevenue) },
    { key: "managementFee", header: "Mgmt fee", align: "right", render: (s) => <span className="text-muted">−{formatCurrency(s.managementFee)}</span> },
    { key: "expenses", header: "Expenses", align: "right", render: (s) => <span className="text-muted">−{formatCurrency(s.expenses)}</span> },
    { key: "netPayout", header: "Net payout", align: "right", render: (s) => <span className="font-medium text-foreground">{formatCurrency(s.netPayout)}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status === "completed" ? "paid" : "pending"} /> },
    { key: "dl", header: "", align: "right", render: (s) => <Button size="sm" variant="outline" onClick={() => { const { payload, filename } = settlementStatementPdf(s); downloadPdf(payload, filename); }}>Statement</Button> },
  ];

  const byProperty = (fin.data?.perProperty ?? []).map((p) => ({ name: p.name, revenue: Math.round(p.revenue / 1_000_000) }));
  const overTime = (fin.data?.series ?? []).map((s) => ({ month: s.label, revenue: Math.round(s.revenue / 1_000_000) }));

  const exportOccupancy = () => {
    generateCSV(properties.data ?? [], [
      { header: "Property", accessor: (p) => p.name },
      { header: "Location", accessor: (p) => p.location },
      { header: "Units", accessor: (p) => p.units },
      { header: "Occupancy %", accessor: (p) => p.occupancy },
    ], "occupancy-report");
  };
  const exportRevenue = () => {
    generateCSV(fin.data?.perProperty ?? [], [
      { header: "Property", accessor: (p) => p.name },
      { header: "Gross Revenue", accessor: (p) => p.revenue },
      { header: "Management Fee", accessor: (p) => p.fee },
      { header: "Expenses", accessor: (p) => p.expenses },
      { header: "Net", accessor: (p) => p.net },
    ], "revenue-report");
  };

  const status = hasSettlement ? "paid" : "pending";
  const now = new Date();
  const nextSettlement = new Date(now.getFullYear(), now.getMonth() + 1, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financials"
        subtitle="Agreement-driven — exactly what your portfolio earns, what Nexora deducts, and what reaches you"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Field label="" htmlFor="of-from"><Input id="of-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Period start" className="h-10" /></Field>
            <Field label="" htmlFor="of-to"><Input id="of-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Period end" className="h-10" /></Field>
          </div>
        }
      />

      {/* SECTION 1 — Revenue */}
      <section>
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Revenue</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Gross revenue" value={formatCurrency(calc?.grossRevenue ?? 0)} icon={<Cash size={22} />} hint="rent + service" />
          <StatCard label="Collected rent" value={formatCurrency(calc?.grossRent ?? 0)} icon={<ChartLineUp size={22} />} hint="confirmed payments" />
          <StatCard label="Pending payments" value={formatCurrency(pendingRent)} icon={<Receipt size={22} />} hint="invoiced, unpaid" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-heading text-h3 font-semibold text-foreground">Revenue by property</h3><span className="text-caption text-muted">UGX M</span></div>
            {fin.loading ? <SkeletonChart className="border-0 p-0" /> : <BarChart data={byProperty} xKey="name" series={[{ key: "revenue", label: "Revenue" }]} height={260} />}
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-heading text-h3 font-semibold text-foreground">Revenue over time</h3><span className="text-caption text-muted">UGX M · 6 months</span></div>
            {fin.loading ? <SkeletonChart className="border-0 p-0" /> : <AreaChart data={overTime} xKey="month" series={[{ key: "revenue", label: "Revenue" }]} height={260} />}
          </Card>
        </div>
      </section>

      {/* SECTION 2 — Deductions */}
      <section>
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Deductions</h2>
        <Card className="p-6">
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <dt className="text-body text-muted">Management fee <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">{calc?.agreementTypeLabel} — {calc?.rateLabel}</span></dt>
              <dd className="font-medium text-foreground">−{formatCurrencyFull(calc?.managementFee ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between py-3"><dt className="text-body text-muted">Property expenses</dt><dd className="text-foreground">−{formatCurrencyFull(calc?.expenses ?? 0)}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="text-body text-muted">Taxes</dt><dd className="text-muted">UGX 0 <span className="text-caption">(Phase 2)</span></dd></div>
            <div className="flex items-center justify-between py-3"><dt className="text-body text-muted">Other charges</dt><dd className="text-foreground">{calc && calc.depositDeductions > 0 ? `−${formatCurrencyFull(calc.depositDeductions)}` : "None"}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="font-semibold text-foreground">Total deductions</dt><dd className="font-semibold text-foreground">−{formatCurrencyFull(calc?.totalDeductions ?? 0)}</dd></div>
          </dl>
        </Card>
      </section>

      {/* SECTION 3 — Net Payout */}
      <section>
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Net payout</h2>
        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-caption uppercase tracking-wide text-muted">Amount payable</p>
              <p className="mt-1 font-heading text-h1 font-semibold text-primary">{formatCurrency(Math.max(0, calc?.netPayout ?? 0))}</p>
            </div>
            <div className="space-y-1 text-caption sm:text-right">
              <div className="flex items-center gap-2 sm:justify-end"><span className="text-muted">Payment status</span><StatusBadge status={status} /></div>
              <p className="text-muted">Last settlement: <span className="text-foreground">{lastSettlement ? formatDate(lastSettlement.processedAt) : "—"}</span></p>
              <p className="text-muted">Next expected: <span className="text-foreground">{formatDate(nextSettlement.toISOString())}</span></p>
            </div>
          </div>
        </Card>
      </section>

      {/* SECTION 4 — Settlement History */}
      <section>
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Settlement history</h2>
        {hasSettlement ? (
          <DataTable columns={settlementCols} data={settlements.data ?? []} getRowId={(s) => s.id} loading={settlements.loading} pageSize={8} />
        ) : (
          <EmptyState icon={<Cash size={22} />} title="No settlements processed yet" description="Your first settlement will be processed per your agreement schedule." />
        )}
      </section>

      {/* SECTION 5 — Reports */}
      <section>
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Reports</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Monthly Statement", icon: <FileLines size={20} />, action: () => { const { payload, filename } = statementPdf(ownerId); downloadPdf(payload, filename); } },
            { label: "Annual Statement", icon: <CalendarMonth size={20} />, action: () => { const { payload, filename } = statementPdf(ownerId, `Year ${new Date().getFullYear()}`); downloadPdf(payload, filename); } },
            { label: "Occupancy Report (CSV)", icon: <ChartPie size={20} />, action: exportOccupancy },
            { label: "Revenue Report (CSV)", icon: <ClipboardList size={20} />, action: exportRevenue },
          ].map((r) => (
            <button key={r.label} type="button" onClick={r.action} className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-elevated p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="text-primary">{r.icon}</span>
              <span className="text-body font-medium text-foreground">{r.label}</span>
              <span className="inline-flex items-center gap-1 text-caption text-primary"><Download size={14} /> Download</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
