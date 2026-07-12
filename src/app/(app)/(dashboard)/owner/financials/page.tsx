"use client";

import * as React from "react";
import { Cash, Receipt, ChartLineUp, Download } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import { BarChart } from "@/components/ui/chart";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton, SkeletonChart } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatUGX, formatUGXFull, formatDate } from "@/lib/format";
import {
  getOwnerDetail, getOwnerFinancials, type OwnerFinancials, type OwnerDetail, type Scope,
} from "@/lib/api/admin";

type PerProperty = OwnerFinancials["perProperty"][number];
type Disbursement = OwnerDetail["disbursements"][number];

export default function OwnerFinancialsPage() {
  const ownerId = useSession((s) => s.user?.ownerId) ?? "";
  const [range, setRange] = React.useState("ytd");
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const fin = useAsync(() => getOwnerFinancials(ownerId, scope), [ownerId, scope]);
  const detail = useAsync(() => getOwnerDetail(ownerId, scope), [ownerId, scope]);

  const perPropColumns: Column<PerProperty>[] = [
    { key: "name", header: "Property", sortable: true, render: (p) => <span className="font-medium text-foreground">{p.name}</span> },
    { key: "revenue", header: "Gross revenue", sortable: true, align: "right", render: (p) => formatUGX(p.revenue) },
    { key: "fee", header: "Mgmt fee", align: "right", render: (p) => <span className="text-muted">−{formatUGX(p.fee)}</span> },
    { key: "expenses", header: "Expenses", align: "right", render: (p) => <span className="text-muted">−{formatUGX(p.expenses)}</span> },
    { key: "net", header: "Net to you", sortable: true, align: "right", render: (p) => <span className="font-medium text-foreground">{formatUGX(p.net)}</span> },
  ];

  const disbColumns: Column<Disbursement>[] = [
    { key: "period", header: "Period", render: (d) => <span className="font-medium text-foreground">{d.period}</span> },
    { key: "net", header: "Net payout", align: "right", render: (d) => formatUGX(d.net) },
    { key: "date", header: "Date", render: (d) => formatDate(d.date) },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status === "paid" ? "paid" : "pending"} /> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financials"
        subtitle="Exactly what your portfolio earns, what Nexora deducts, and what reaches you"
        actions={
          <div className="flex items-center gap-2">
            <select className={`${selectClass} w-40`} value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="ytd">Year to date</option>
              <option value="12m">Last 12 months</option>
            </select>
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Export", { description: "Statement export is mocked in this build." })}>
              <Download size={18} /> Export
            </Button>
          </div>
        }
      />

      {/* KPI row from getOwnerDetail (same figures as the admin Owner record) */}
      {detail.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-28" /></Card>)}
        </div>
      ) : detail.error ? (
        <EmptyState title="Couldn’t load financials" description={detail.error} action={<Button variant="outline" size="sm" onClick={detail.reload}>Try again</Button>} />
      ) : detail.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gross revenue / mo" value={formatUGX(detail.data.financials.monthlyRevenue)} icon={<Cash size={22} />} />
          <StatCard label="YTD revenue" value={formatUGX(detail.data.financials.ytdRevenue)} icon={<ChartLineUp size={22} />} />
          <StatCard label="Disbursed to you" value={formatUGX(detail.data.financials.disbursed)} icon={<Cash size={22} />} hint="net, year to date" />
          <StatCard label="Outstanding" value={formatUGX(detail.data.financials.outstanding)} icon={<Receipt size={22} />} hint={detail.data.financials.outstanding > 0 ? "in arrears" : "all settled"} />
        </div>
      ) : null}

      {/* Revenue vs expenses + fee breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Revenue vs expenses</h2>
            <span className="text-caption text-muted">UGX · last 6 months</span>
          </div>
          {fin.loading ? <SkeletonChart className="border-0 p-0" /> : fin.error ? (
            <EmptyState title="Couldn’t load chart" description={fin.error} action={<Button variant="outline" size="sm" onClick={fin.reload}>Try again</Button>} />
          ) : (
            <BarChart
              data={(fin.data?.series ?? []).map((s) => ({ month: s.label, revenue: Math.round(s.revenue / 1_000_000), expenses: Math.round(s.expenses / 1_000_000) }))}
              xKey="month"
              series={[{ key: "revenue", label: "Revenue (M)" }, { key: "expenses", label: "Expenses (M)" }]}
              height={280}
            />
          )}
        </Card>

        {/* Management-fee breakdown → net disbursement */}
        <Card className="flex flex-col p-6">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">How your payout is calculated</h2>
          {fin.loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : fin.data ? (
            <>
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-4"><dt className="text-muted">Gross revenue</dt><dd className="font-medium text-foreground">{formatUGXFull(fin.data.feeBreakdown.grossRevenue)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Management fee ({Math.round(fin.data.feeBreakdown.feeRate * 100)}%)</dt><dd className="text-foreground">−{formatUGXFull(fin.data.feeBreakdown.managementFee)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Property expenses</dt><dd className="text-foreground">−{formatUGXFull(fin.data.feeBreakdown.otherDeductions)}</dd></div>
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-caption uppercase tracking-wide text-muted">Net disbursement</p>
                <p className="mt-1 font-heading text-h1 font-semibold text-primary">{formatUGX(fin.data.feeBreakdown.netDisbursement)}</p>
                <p className="mt-1 text-caption text-muted">Paid to your account monthly, on the 5th.</p>
              </div>
            </>
          ) : (
            <EmptyState title="Unavailable" description="Couldn’t load the breakdown." />
          )}
        </Card>
      </div>

      {/* Per-property breakdown */}
      <section>
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Per-property breakdown</h2>
        <DataTable
          columns={perPropColumns} data={fin.data?.perProperty ?? []} getRowId={(p) => p.id}
          loading={fin.loading} error={fin.error} onRetry={fin.reload}
          emptyTitle="No data" emptyDescription="Property financials will appear here." pageSize={8}
        />
      </section>

      {/* Disbursement history */}
      <section>
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Disbursement history</h2>
        <DataTable
          columns={disbColumns} data={detail.data?.disbursements ?? []} getRowId={(d) => d.id}
          loading={detail.loading} error={detail.error} onRetry={detail.reload}
          emptyTitle="No disbursements" emptyDescription="Payouts will appear here." pageSize={8}
        />
      </section>
    </div>
  );
}
