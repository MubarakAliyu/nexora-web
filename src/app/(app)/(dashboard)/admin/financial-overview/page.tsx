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
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { CheckCircle, Download, ArrowRight, ExclamationCircle } from "flowbite-react-icons/outline";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { ownerOptions } from "@/lib/api/admin";
import { downloadPdf } from "@/lib/pdf/download";
import { settlementStatementPdf } from "@/lib/pdf/builders";
import {
  computeOwnerSettlement, processSettlement, defaultSettlementPeriod,
  type SettlementRecord,
} from "@/lib/api/settlement";
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

const STEPS = ["Select Period", "Calculate", "Review & Approve", "Complete"];

function ProcessSettlementDialog({ settlement, onOpenChange, onDone }: { settlement: OwnerSettlement | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const open = !!settlement;
  const [step, setStep] = React.useState(0);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [note, setNote] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<SettlementRecord | null>(null);

  React.useEffect(() => {
    if (open) { const p = defaultSettlementPeriod(); setStep(0); setFrom(p.from); setTo(p.to); setNote(""); setResult(null); }
  }, [open, settlement?.ownerId]);

  const calc = React.useMemo(
    () => (settlement && from && to ? computeOwnerSettlement(settlement.ownerId, from, to) : null),
    [settlement, from, to],
  );

  const doProcess = async () => {
    if (!settlement) return;
    setConfirmOpen(false); setBusy(true);
    try {
      const rec = await processSettlement({ ownerId: settlement.ownerId, from, to, note });
      setResult(rec);
      toast.success("Settlement processed", { description: `${formatUGX(rec.netPayout)} to ${rec.ownerName}` });
      setStep(3); onDone();
    } catch { toast.error("Couldn’t process settlement"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {settlement && calc && (
          <>
            <DialogHeader>
              <DialogTitle>Process Settlement — Step {step + 1} of 4</DialogTitle>
              <DialogDescription>{STEPS[step]}</DialogDescription>
            </DialogHeader>
            <div className="mb-1 flex items-center gap-1">
              {STEPS.map((s, i) => <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />)}
            </div>

            {/* STEP 1 — period */}
            {step === 0 && (
              <div className="space-y-4 py-2 motion-safe:animate-in motion-safe:fade-in">
                <div className="rounded-xl bg-surface-hover p-4 text-caption">
                  <p className="font-medium text-foreground">{calc.ownerName} — {calc.agreementTypeLabel}: {calc.rateLabel}</p>
                  <p className="text-muted">Settlement schedule: {calc.settlementSchedule ?? "—"}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Period start" htmlFor="st-from"><Input id="st-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                  <Field label="Period end" htmlFor="st-to"><Input id="st-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
                </div>
                <p className="rounded-lg border border-border p-3 text-body text-foreground">
                  Found <span className="font-semibold">{calc.rentPayments.length}</span> payment{calc.rentPayments.length === 1 ? "" : "s"} totaling <span className="font-semibold text-primary">{formatUGX(calc.grossRent)}</span> in this period.
                </p>
                <div className="flex justify-end"><Button onClick={() => setStep(1)}>Next</Button></div>
              </div>
            )}

            {/* STEP 2 — calculate */}
            {step === 1 && (
              <div className="space-y-4 py-2 motion-safe:animate-in motion-safe:fade-in">
                <section>
                  <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-muted">Revenue</p>
                  <div className="rounded-xl border border-border">
                    {calc.rentPayments.length === 0 ? <p className="p-3 text-caption text-muted">No rent collected in this period.</p> : calc.rentPayments.map((r, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-border px-3 py-2 text-caption last:border-0">
                        <span className="text-foreground">{r.label} <span className="text-muted">· {r.sub}</span></span>
                        <span className="text-foreground">{formatUGX(r.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 text-body font-medium"><span className="text-muted">Total gross revenue</span><span className="text-foreground">{formatUGX(calc.grossRevenue)}</span></div>
                  </div>
                </section>
                <section>
                  <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-muted">Deductions</p>
                  <div className="space-y-1.5 rounded-xl border border-border p-3 text-caption">
                    <div className="flex justify-between"><span className="text-muted">Management fee — {calc.feeMath}</span><span className="text-foreground">−{formatUGX(calc.managementFee)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Property expenses</span><span className="text-foreground">−{formatUGX(calc.expenses)}</span></div>
                    {calc.depositDeductions > 0 && <div className="flex justify-between"><span className="text-muted">Deposit deductions</span><span className="text-foreground">−{formatUGX(calc.depositDeductions)}</span></div>}
                    <div className="flex justify-between border-t border-border pt-1.5 font-medium"><span className="text-foreground">Total deductions</span><span className="text-foreground">−{formatUGX(calc.totalDeductions)}</span></div>
                  </div>
                </section>
                <div className={cn("rounded-xl border p-4", calc.netPayout > 0 ? "border-primary/30 bg-primary/5" : "border-primary/40 bg-primary/10")}>
                  <p className="text-caption uppercase tracking-wide text-muted">Net owner earnings</p>
                  <p className="mt-1 font-heading text-h1 font-semibold text-primary">{formatUGX(Math.max(0, calc.netPayout))}</p>
                  {calc.netPayout < 0 && <p className="mt-1 text-caption text-primary">Expenses exceeded revenue this period. No settlement is due.</p>}
                  {calc.netPayout === 0 && <p className="mt-1 text-caption text-muted">No settlement due for this period.</p>}
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setStep(0)}>Back</Button><Button onClick={() => setStep(2)}>Next</Button></div>
              </div>
            )}

            {/* STEP 3 — review & approve */}
            {step === 2 && (
              <div className="space-y-4 py-2 motion-safe:animate-in motion-safe:fade-in">
                <dl className="space-y-1.5 rounded-xl border border-border p-4 text-caption">
                  <div className="flex justify-between"><dt className="text-muted">Settlement period</dt><dd className="text-foreground">{calc.periodLabel}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Gross revenue</dt><dd className="text-foreground">{formatUGX(calc.grossRevenue)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Management fee ({calc.agreementTypeLabel}, {calc.rateLabel})</dt><dd className="text-foreground">−{formatUGX(calc.managementFee)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Expenses</dt><dd className="text-foreground">−{formatUGX(calc.expenses)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-1.5"><dt className="font-semibold text-foreground">Net payout</dt><dd className="font-heading text-h3 font-semibold text-primary">{formatUGX(Math.max(0, calc.netPayout))}</dd></div>
                </dl>
                {calc.hasBankDetails ? (
                  <div className="rounded-xl border border-border p-4 text-caption">
                    <p className="mb-1 font-medium text-foreground">Payout details</p>
                    <p className="text-muted">Bank: <span className="text-foreground">{calc.bankName ?? "—"}</span></p>
                    <p className="text-muted">Account: <span className="text-foreground">{calc.bankMasked}</span></p>
                    <p className="text-muted">Account name: <span className="text-foreground">{calc.accountName}</span></p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-caption">
                    <p className="flex items-center gap-2 font-medium text-primary"><ExclamationCircle size={16} /> Bank details not on file for this owner.</p>
                    <p className="mt-1 text-muted">Settlement cannot be processed until payout information is provided.</p>
                    <Link href={`/admin/owners/${settlement.ownerId}`} className="mt-2 inline-block font-medium text-primary hover:text-accent">Update owner bank details →</Link>
                  </div>
                )}
                <Field label="Settlement note (optional)" htmlFor="st-note"><Textarea id="st-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. June 2026 monthly settlement" /></Field>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setConfirmOpen(true)} disabled={!calc.hasBankDetails}>Approve &amp; Process Settlement</Button>
                </div>
              </div>
            )}

            {/* STEP 4 — complete */}
            {step === 3 && result && (
              <div className="space-y-5 py-4 text-center motion-safe:animate-in motion-safe:fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary motion-safe:animate-in motion-safe:zoom-in"><CheckCircle size={40} /></div>
                <p className="font-heading text-h3 font-semibold text-foreground">Settlement of {formatUGX(result.netPayout)} has been processed for {result.ownerName}</p>
                <div className="flex flex-col justify-center gap-2 sm:flex-row">
                  <Button className="gap-2" onClick={() => { const { payload, filename } = settlementStatementPdf(result); downloadPdf(payload, filename); }}><Download size={18} /> Download Settlement Statement</Button>
                  <Button variant="outline" onClick={() => { const p = defaultSettlementPeriod(); setResult(null); setStep(0); setFrom(p.from); setTo(p.to); setNote(""); }}>Process Another Settlement</Button>
                  <Button variant="outline" className="gap-2" onClick={() => onOpenChange(false)}>Return to Overview <ArrowRight size={16} /></Button>
                </div>
              </div>
            )}

            {/* Confirm dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Process settlement?</DialogTitle>
                  <DialogDescription>Process settlement of {formatUGX(Math.max(0, calc.netPayout))} to {calc.ownerName}? This will be recorded as a completed transaction.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={doProcess} loading={busy}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
    { key: "expenses", header: "Expenses", align: "right", render: (s) => s.hasAgreement ? <span className="text-muted">−{formatUGX(s.expenses)}</span> : "—" },
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
      <ProcessSettlementDialog settlement={processing} onOpenChange={(o) => !o && setProcessing(null)} onDone={() => { kpis.reload(); settlements.reload(); tx.reload(); }} />
    </div>
  );
}
