"use client";

import * as React from "react";
import Link from "next/link";
import { Cash, ChartLineUp, Receipt, ChartPie, Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/ui/chart";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SkeletonChart } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { ownerOptions } from "@/lib/api/admin";
import {
  getFinancialKpis, getRevenueBreakdown, listFinancialTransactions, listOwnerSettlements,
  type FinanceTxRow, type OwnerSettlement,
} from "@/lib/api/finance";

function MoneyStat({ value }: { value: number }) {
  const m = value / 1_000_000;
  return <span>UGX <CountUp to={m} decimals={m < 100 ? 1 : 0} duration={1.2} immediate />M</span>;
}

const KIND_TONE: Record<string, "default" | "muted" | "accent"> = {
  "Rent Payment": "default", "Service Payment": "accent", "Owner Settlement": "muted",
  Commission: "default", Expense: "muted", Refund: "accent",
};

/* -------------------------------------------------- transaction detail */

function TxDetailDialog({ tx, onOpenChange }: { tx: FinanceTxRow | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!tx} onOpenChange={onOpenChange}>
      <DialogContent>
        {tx && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{tx.reference} <Badge variant={KIND_TONE[tx.kind]}>{tx.kind}</Badge></DialogTitle>
              <DialogDescription>{tx.description}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className={cn("font-semibold", tx.direction === "in" ? "text-primary" : "text-muted")}>{tx.direction === "in" ? "+" : "−"}{formatUGX(tx.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Date</dt><dd className="text-foreground">{formatDate(tx.date)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><StatusBadge status={tx.status} /></dd></div>
              {tx.entity && <div className="flex justify-between"><dt className="text-muted">Linked</dt><dd><Link href={tx.entity.href} className="text-primary hover:text-accent">{tx.entity.label}</Link></dd></div>}
            </dl>
            <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------- process settlement */

function ProcessSettlementDialog({ settlement, onOpenChange }: { settlement: OwnerSettlement | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!settlement} onOpenChange={onOpenChange}>
      <DialogContent>
        {settlement && (
          <>
            <DialogHeader>
              <DialogTitle>Settlement Workflow</DialogTitle>
              <DialogDescription>
                This feature will be fully built in Revision Batch D. For now, this confirms the settlement flow will be wired here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-xl border border-border p-4 text-body">
              <div className="flex justify-between"><span className="text-muted">Gross</span><span className="font-medium text-foreground">{formatUGX(settlement.gross)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Commission ({settlement.rateLabel})</span><span className="text-foreground">−{formatUGX(settlement.commission)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold text-foreground">Net to owner</span><span className="font-heading text-h3 font-semibold text-primary">{formatUGX(settlement.net)}</span></div>
              <div className="flex justify-between pt-1"><span className="text-muted">Owner bank</span><span className="text-foreground">{settlement.payoutAccount ?? "No bank on file"}</span></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
              <span title="Coming in Revision Batch D"><Button disabled>Process</Button></span>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- page */

export default function FinancialOverviewPage() {
  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const kpis = useAsync(() => getFinancialKpis(scope), [scope]);
  const revenue = useAsync(() => getRevenueBreakdown(scope), [scope]);
  const settlements = useAsync(() => listOwnerSettlements(scope), [scope]);
  const owners = React.useMemo(() => ownerOptions(), []);

  const [kind, setKind] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [ownerId, setOwnerId] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [q, setQ] = React.useState("");
  const [detail, setDetail] = React.useState<FinanceTxRow | null>(null);
  const [processing, setProcessing] = React.useState<OwnerSettlement | null>(null);

  const txFilters = React.useMemo(() => ({ kind, status, ownerId, from: from || undefined, to: to || undefined, q: q || undefined, forceError: debugErrorFlag() }), [kind, status, ownerId, from, to, q]);
  const tx = useAsync(() => listFinancialTransactions(txFilters), [txFilters]);

  const txColumns: Column<FinanceTxRow>[] = [
    { key: "date", header: "Date", sortable: true, render: (r) => formatDate(r.date) },
    { key: "kind", header: "Type", render: (r) => <Badge variant={KIND_TONE[r.kind]}>{r.kind}</Badge> },
    { key: "description", header: "Description", render: (r) => <span className="text-foreground">{r.description}</span> },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (r) => <span className={cn("font-medium", r.direction === "in" ? "text-primary" : "text-muted")}>{r.direction === "in" ? "+" : "−"}{formatUGX(r.amount)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "reference", header: "Reference", render: (r) => <span className="text-caption text-muted">{r.reference}</span> },
    { key: "entity", header: "Linked", render: (r) => r.entity ? <Link href={r.entity.href} onClick={(e) => e.stopPropagation()} className="text-primary hover:text-accent">{r.entity.label}</Link> : "—" },
  ];

  const settlementColumns: Column<OwnerSettlement>[] = [
    { key: "ownerName", header: "Owner", sortable: true, render: (s) => <Link href={`/admin/owners/${s.ownerId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-primary">{s.ownerName}</Link> },
    { key: "agreementTypeLabel", header: "Agreement", render: (s) => s.hasAgreement ? <Badge variant="muted">{s.agreementTypeLabel}</Badge> : <span className="text-caption text-primary">No agreement</span> },
    { key: "rateLabel", header: "Rate", render: (s) => s.rateLabel ?? "—" },
    { key: "gross", header: "Gross", align: "right", render: (s) => formatUGX(s.gross) },
    { key: "commission", header: "Nexora commission", align: "right", render: (s) => s.hasAgreement ? <span title={s.commissionMath}>{formatUGX(s.commission)}</span> : "—" },
    { key: "net", header: "Net to owner", align: "right", render: (s) => <span className="font-medium text-foreground">{formatUGX(s.net)}</span> },
    { key: "nextSettlement", header: "Next", render: (s) => s.nextSettlement === "On demand" ? "On demand" : s.nextSettlement ? formatDate(s.nextSettlement) : "—" },
    { key: "status", header: "Status", render: (s) => s.hasAgreement ? <StatusBadge status={s.status === "settled" ? "paid" : s.status} /> : <span className="text-caption text-muted">—</span> },
    {
      key: "action", header: "", align: "right",
      render: (s) => s.hasAgreement
        ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setProcessing(s); }}>Process</Button>
        : <Link href="/admin/agreements" onClick={(e) => e.stopPropagation()} className="text-caption font-medium text-primary hover:text-accent">Create agreement</Link>,
    },
  ];

  return (
    <div>
      <PageHeader title="Financial Overview" subtitle="Revenue, settlements and Nexora earnings — records only, agreement-driven" />

      {/* KPIs */}
      {kpis.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><div className="h-4 w-24 animate-pulse rounded bg-surface-hover" /><div className="mt-3 h-8 w-28 animate-pulse rounded bg-surface-hover" /></Card>)}</div>
      ) : kpis.error ? (
        <EmptyState icon={<ChartPie size={22} />} title="Couldn’t load financials" description={kpis.error} action={<Button variant="outline" size="sm" onClick={kpis.reload}>Try again</Button>} />
      ) : kpis.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total revenue" value={<MoneyStat value={kpis.data.totalRevenue} />} icon={<Cash size={22} />} hint="rent + service" />
          <StatCard label="Total settlements" value={<MoneyStat value={kpis.data.totalSettlements} />} icon={<ChartLineUp size={22} />} hint="paid to owners" />
          <StatCard label="Pending payouts" value={<MoneyStat value={kpis.data.pendingPayouts} />} icon={<Receipt size={22} />} hint="awaiting settlement" />
          <StatCard label="Nexora earnings" value={<MoneyStat value={kpis.data.nexoraEarnings} />} icon={<ChartPie size={22} />} hint="commissions & fees" />
        </div>
      ) : null}

      {/* Revenue breakdown */}
      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-h3 font-semibold text-foreground">Revenue breakdown</h2>
          <span className="text-caption text-muted">UGX M · rent vs service · last 6 months</span>
        </div>
        {revenue.loading ? <SkeletonChart className="border-0 p-0" /> : revenue.error ? (
          <EmptyState title="Couldn’t load chart" description={revenue.error} action={<Button variant="outline" size="sm" onClick={revenue.reload}>Try again</Button>} />
        ) : (
          <BarChart data={(revenue.data ?? []) as unknown as Record<string, number>[]} xKey="label" series={[{ key: "rent", label: "Rent revenue" }, { key: "service", label: "Service revenue" }]} height={280} />
        )}
      </Card>

      <Tabs defaultValue="transactions" className="mt-8">
        <TabsList>
          <TabsTrigger value="transactions">Transaction history</TabsTrigger>
          <TabsTrigger value="settlements">Owner settlements</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search transactions" className="h-10 pl-10" />
            </div>
            <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
              <option value="all">All types</option>
              <option>Rent Payment</option><option>Service Payment</option><option>Owner Settlement</option><option>Commission</option><option>Expense</option>
            </select>
            <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
            </select>
            <select className={selectClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} aria-label="Owner">
              <option value="all">All owners</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" className="h-10" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" className="h-10" />
          </div>
          <DataTable columns={txColumns} data={tx.data ?? []} getRowId={(r) => r.id} loading={tx.loading} error={tx.error} onRetry={tx.reload} onRowClick={(r) => setDetail(r)} emptyTitle="No transactions" emptyDescription="Financial records will appear here." pageSize={12} />
        </TabsContent>

        <TabsContent value="settlements">
          <p className="mb-4 text-caption text-muted">Every settlement is calculated from the owner’s management agreement — no hardcoded rates.</p>
          <DataTable columns={settlementColumns} data={settlements.data ?? []} getRowId={(s) => s.ownerId} loading={settlements.loading} error={settlements.error} onRetry={settlements.reload} emptyTitle="No owners" emptyDescription="Owner settlements will appear here." pageSize={10} />
        </TabsContent>
      </Tabs>

      <TxDetailDialog tx={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <ProcessSettlementDialog settlement={processing} onOpenChange={(o) => !o && setProcessing(null)} />
    </div>
  );
}
