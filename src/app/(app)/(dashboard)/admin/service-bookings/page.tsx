"use client";

import * as React from "react";
import { Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { StatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate, formatUGX } from "@/lib/format";
import {
  listServiceBookings, getServiceBooking, updateServiceBookingStatus, assignServiceBooking,
} from "@/lib/api/rentals";
import { serviceStaffFor } from "@/lib/api/admin";
import {
  SERVICE_STATUS_LABEL, canTransition, transitionHint, startServiceWork, getServiceRevenueSummary,
} from "@/lib/api/service-lifecycle";
import {
  AssessmentDialog, InvoiceDialog, PaymentDialog, CompletionDialog,
  ConfirmCompletionDialog, CancelBookingDialog, AssessmentPanel,
} from "@/components/admin/service-workflow-dialogs";
import { QuotationPanel } from "@/components/admin/quotation-panel";
import { quotationForBooking } from "@/lib/api/catalogue";
import { downloadPdf } from "@/lib/pdf/download";
import { serviceInvoicePdf } from "@/lib/pdf/builders";
import { Download } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/stores/session";
import type { ServiceBooking, ServiceBookingStatus } from "@/lib/mock/types";


const ALL_STATUSES = Object.keys(SERVICE_STATUS_LABEL) as ServiceBookingStatus[];

function DetailDialog({ id, onOpenChange, onDone, onWorkflow, refreshKey }: {
  id: string | null; onOpenChange: (o: boolean) => void; onDone: () => void;
  onWorkflow: (kind: "assess" | "invoice" | "payment" | "complete" | "confirm" | "cancel", sb: ServiceBooking) => void;
  refreshKey: number;
}) {
  const { data, loading, reload } = useAsync(() => (id ? getServiceBooking(id) : Promise.resolve(null as unknown as ServiceBooking)), [id, refreshKey]);
  const [busy, setBusy] = React.useState(false);
  const [assignee, setAssignee] = React.useState("");
  const [pendingStatus, setPendingStatus] = React.useState<ServiceBookingStatus>("new");

  React.useEffect(() => { if (data?.assignee) setAssignee(data.assignee); }, [data?.assignee]);
  React.useEffect(() => { if (data?.status) setPendingStatus(data.status); }, [data?.status]);

  const onCancel = (sb: ServiceBooking) => onWorkflow("cancel", sb);

  /** The single action that moves this booking forward, by current status. */
  const nextAction = (sb: ServiceBooking): { label: string; run: () => void } | null => {
    switch (sb.status) {
      case "new": case "pending":
        return { label: "Assign Staff", run: () => document.getElementById("sb-assignee")?.focus() };
      case "assigned": case "assessment_required":
        return { label: "Record Assessment", run: () => onWorkflow("assess", sb) };
      case "assessment_completed":
        return { label: "Generate Invoice", run: () => onWorkflow("invoice", sb) };
      case "invoice_generated": case "awaiting_payment":
        return { label: "Record Payment", run: () => onWorkflow("payment", sb) };
      case "paid":
        return { label: "Start Work", run: () => startWork(sb.id) };
      case "in_progress":
        return { label: "Mark Completed", run: () => onWorkflow("complete", sb) };
      case "completed":
        return { label: "Confirm Completion", run: () => onWorkflow("confirm", sb) };
      default:
        return null;
    }
  };

  const startWork = async (bookingId: string) => {
    setBusy(true);
    try { await startServiceWork(bookingId); toast.success("Work started"); reload(); onDone(); }
    catch { toast.error("Couldn’t start work"); } finally { setBusy(false); }
  };

  const setStatus = async (status: ServiceBookingStatus) => {
    if (!id) return;
    setBusy(true);
    try { await updateServiceBookingStatus(id, status); toast.success("Status updated"); reload(); onDone(); }
    catch { toast.error("Couldn’t update"); } finally { setBusy(false); }
  };
  const assign = async () => {
    if (!id || !assignee) return;
    setBusy(true);
    try { await assignServiceBooking(id, assignee); toast.success(`Assigned to ${assignee}`); reload(); onDone(); }
    catch { toast.error("Couldn’t assign"); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {loading || !data ? (
          <div className="space-y-3 py-6"><div className="h-6 w-40 animate-pulse rounded bg-surface-hover" /><div className="h-24 w-full animate-pulse rounded bg-surface-hover" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{data.reference} <Badge variant="muted">{data.kind === "cleaning" ? "Cleaning" : "Lifestyle"}</Badge></DialogTitle>
              <DialogDescription>{data.category}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-hover px-4 py-3">
                <span className="text-caption text-muted">Status</span><StatusBadge status={data.status} />
              </div>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between"><dt className="text-muted">Client</dt><dd className="text-foreground">{data.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Contact</dt><dd className="text-foreground">{data.email} · {data.phone}</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Address</dt><dd className="text-right text-foreground">{data.location}</dd></div>
                {data.propertyType && <div className="flex justify-between"><dt className="text-muted">Property</dt><dd className="text-foreground">{data.propertyType}{data.size ? ` · ${data.size}` : ""}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">When</dt><dd className="text-foreground">{formatDate(data.date)} · {data.time}</dd></div>
                {data.details && <div className="flex justify-between gap-6"><dt className="text-muted">Details</dt><dd className="text-right text-foreground">{data.details}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Assignee</dt><dd className="text-foreground">{data.assignee ?? "Unassigned"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Booking type</dt><dd className="text-foreground">{data.kind === "cleaning" ? "Cleaning service" : "Home & lifestyle service"}</dd></div>
                {data.customerId && <div className="flex justify-between"><dt className="text-muted">Customer ID</dt><dd className="font-mono text-caption text-foreground">{data.customerId}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Date created</dt><dd className="text-foreground">{formatDate(data.createdAt)}</dd></div>
              </dl>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Payment</p>
                <dl className="space-y-1.5 text-body">
                  <div className="flex items-center justify-between"><dt className="text-muted">Payment status</dt><dd><StatusBadge status={data.paymentStatus ?? "pending"} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="text-foreground">{data.amount != null ? formatUGX(data.amount) : "Pending assessment"}</dd></div>
                  {data.paymentMethod && <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="capitalize text-foreground">{data.paymentMethod.replace(/_/g, " ")}</dd></div>}
                  {data.paymentReference && <div className="flex justify-between"><dt className="text-muted">Transaction ref</dt><dd className="font-mono text-caption text-foreground">{data.paymentReference}</dd></div>}
                </dl>
              </div>
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Assign staff</p>
                <div className="flex gap-2">
                  <select id="sb-assignee" className={selectClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
                    <option value="">Select…</option>
                    {serviceStaffFor(data.kind, data.category).map((s) => <option key={s.id} value={s.name}>{s.label}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" disabled={busy || !assignee} onClick={assign}>Assign</Button>
                </div>
              </div>
              <AssessmentPanel booking={data} />
              <QuotationPanel bookingId={data.id} />

              {/* Contextual primary action — drives the money workflow */}
              {(() => {
                const a = nextAction(data);
                if (!a) return null;
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Next step</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={a.run}>{a.label}</Button>
                      {data.status === "completed" && (
                        <span className="self-center text-caption text-muted">Awaiting manager confirmation</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status management — same select → Save pattern as maintenance */}
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Change status</p>
                <div className="flex flex-wrap gap-2">
                  <select className={selectClass} value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value as ServiceBookingStatus)} aria-label="Status">
                    <option value={data.status}>{SERVICE_STATUS_LABEL[data.status]} (current)</option>
                    {ALL_STATUSES.filter((s) => s !== data.status).map((s) => {
                      const ok = canTransition(data.status, s);
                      return (
                        <option key={s} value={s} disabled={!ok} title={ok ? "" : transitionHint(data.status, s)}>
                          {SERVICE_STATUS_LABEL[s]}{ok ? "" : " — unavailable"}
                        </option>
                      );
                    })}
                  </select>
                  <Button size="sm" variant="secondary" disabled={busy || pendingStatus === data.status || !canTransition(data.status, pendingStatus)} onClick={() => setStatus(pendingStatus)}>Save Changes</Button>
                  {data.status !== "cancelled" && data.status !== "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => onCancel(data)}>Cancel booking</Button>
                  )}
                </div>
                {pendingStatus !== data.status && !canTransition(data.status, pendingStatus) && (
                  <p className="mt-2 text-caption text-primary">{transitionHint(data.status, pendingStatus)}</p>
                )}
              </div>

              {/* Documents */}
              {(data.invoiceNumber || data.paidAmount) && (
                <div className="flex flex-wrap gap-2">
                  {data.invoiceNumber && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => { const { payload, filename } = serviceInvoicePdf(data.id, "invoice"); downloadPdf(payload, filename); }}>
                      <Download size={16} /> Download Invoice
                    </Button>
                  )}
                  {(data.paidAmount ?? 0) > 0 && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => { const { payload, filename } = serviceInvoicePdf(data.id, "receipt"); downloadPdf(payload, filename); }}>
                      <Download size={16} /> Download Receipt
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUSES = ["all", ...ALL_STATUSES];

export default function ServiceBookingsPage() {
  const [kind, setKind] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [q, setQ] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  // One dialog per workflow step; `bump` re-reads the detail after each mutation.
  const [wf, setWf] = React.useState<{ kind: string; sb: ServiceBooking } | null>(null);
  const [bump, setBump] = React.useState(0);

  const user = useSession((s) => s.user);
  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listServiceBookings(scope), [scope, bump]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bump/data force a re-read after each mutation
  const summary = React.useMemo(() => getServiceRevenueSummary(from || undefined, to || undefined), [from, to, bump, data]);

  const afterWorkflow = () => { setBump((n) => n + 1); reload(); };
  const openWorkflow = (kind: "assess" | "invoice" | "payment" | "complete" | "confirm" | "cancel", sb: ServiceBooking) => setWf({ kind, sb });

  const rows = React.useMemo(() => {
    let r = data ?? [];
    if (kind !== "all") r = r.filter((s) => s.kind === kind);
    if (status !== "all") r = r.filter((s) => s.status === status);
    if (from) r = r.filter((s) => s.date >= from);
    if (to) r = r.filter((s) => s.date <= to + "T23:59:59.999Z");
    if (q) { const t = q.toLowerCase(); r = r.filter((s) => s.reference.toLowerCase().includes(t) || s.name.toLowerCase().includes(t) || s.category.toLowerCase().includes(t)); }
    return [...r].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data, kind, status, from, to, q]);

  const columns: Column<ServiceBooking>[] = [
    { key: "reference", header: "Reference", sortable: true, render: (s) => <span className="font-medium text-foreground">{s.reference}</span> },
    { key: "name", header: "Client", sortable: true, render: (s) => <div><p className="font-medium text-foreground">{s.name}</p><p className="text-caption text-muted">{s.phone}</p></div> },
    { key: "kind", header: "Service", render: (s) => <Badge variant="muted">{s.kind === "cleaning" ? "Cleaning" : "Lifestyle"}</Badge> },
    { key: "category", header: "Category", sortable: true, render: (s) => s.category },
    { key: "date", header: "Date / time", sortable: true, render: (s) => <span className="text-body">{formatDate(s.date)} · {s.time}</span> },
    { key: "assignee", header: "Assignee", render: (s) => s.assignee ?? <span className="text-muted">Unassigned</span> },
    { key: "status", header: "Status", sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    { key: "paymentStatus", header: "Payment", render: (s) => <StatusBadge status={s.paymentStatus ?? "not_invoiced"} /> },
    {
      /* F1 — what the customer actually agreed to, at the prices they agreed to. */
      key: "quoteTotal", header: "Quote Total", align: "right", sortable: true,
      sortValue: (s) => s.quoteTotal ?? 0,
      render: (s) => {
        const q = quotationForBooking(s.id);
        if (!q) return <span className="text-caption text-muted">—</span>;
        const flagged = q.lines.some((l) => l.excludedFromTotal);
        return (
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className="tabular-nums font-medium text-foreground">{formatUGX(q.total)}</span>
            {/* Items needing a separate quote are the ones an admin must chase. */}
            {flagged && <Badge className="border-accent/40 bg-surface-active text-foreground">Quote</Badge>}
          </span>
        );
      },
    },
    {
      key: "amount", header: "Amount", align: "right",
      render: (s) => {
        const amt = s.invoiceAmount ?? s.assessedAmount;
        return amt ? <span className="tabular-nums text-foreground">{formatUGX(amt)}</span> : <span className="text-caption text-muted">Pending assessment</span>;
      },
    },
    { key: "location", header: "Address", render: (s) => <span className="text-caption text-muted">{s.location}</span> },
  ];

  return (
    <div>
      <PageHeader title="Service Bookings" subtitle="Cleaning and Home & Lifestyle service requests from the marketing site"
        actions={<ExportCsvButton data={rows} filename="service-bookings" columns={[
          { header: "Reference", accessor: (s) => s.reference },
          { header: "Client", accessor: (s) => s.name },
          { header: "Phone", accessor: (s) => s.phone },
          { header: "Service", accessor: (s) => s.kind },
          { header: "Category", accessor: (s) => s.category },
          { header: "Date", accessor: (s) => s.date.slice(0, 10) },
          { header: "Assignee", accessor: (s) => s.assignee ?? "" },
          { header: "Status", accessor: (s) => s.status },
          { header: "Quote Total", accessor: (s) => s.quoteTotal ?? "" },
          { header: "Location", accessor: (s) => s.location },
        ]} />} />

      {/* Service revenue — all derived from real assessments/invoices/payments */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total invoiced", value: summary.totalInvoiced, money: true },
          { label: "Total collected", value: summary.totalCollected, money: true },
          { label: "Awaiting payment", value: summary.awaitingPayment, money: true },
          { label: "Jobs completed", value: summary.jobsCompleted, money: false },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="font-heading text-h2 font-semibold text-foreground">
              {c.money
                ? <>UGX <CountUp to={c.value / 1_000_000} decimals={1} duration={1} immediate />M</>
                : <CountUp to={c.value} immediate />}
            </p>
            <p className="text-caption text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search service bookings" className="h-10 pl-10" />
        </div>
        <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Service type">
          <option value="all">All services</option>
          <option value="cleaning">Cleaning</option>
          <option value="lifestyle">Home & Lifestyle</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</option>)}
        </select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-10" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-10" />
      </div>

      <DataTable
        columns={columns} data={rows} getRowId={(s) => s.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(s) => setDetailId(s.id)}
        rowClassName={(s) => cn(
          (s.paymentStatus === "awaiting_payment" || s.paymentStatus === "partially_paid") && "border-l-2 border-l-primary bg-primary/[0.03]",
        )}
        emptyTitle="No service bookings" emptyDescription="Cleaning and lifestyle bookings will appear here." pageSize={12}
      />

      <DetailDialog id={detailId} onOpenChange={(o) => !o && setDetailId(null)} onDone={reload} onWorkflow={openWorkflow} refreshKey={bump} />

      {/* Workflow steps — one dialog each, conditional-rendered */}
      <AssessmentDialog booking={wf?.kind === "assess" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} />
      <InvoiceDialog booking={wf?.kind === "invoice" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} />
      <PaymentDialog booking={wf?.kind === "payment" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} />
      <CompletionDialog booking={wf?.kind === "complete" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} />
      <ConfirmCompletionDialog booking={wf?.kind === "confirm" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} confirmedBy={user?.name ?? "Admin"} />
      <CancelBookingDialog booking={wf?.kind === "cancel" ? wf.sb : null} onOpenChange={(o) => !o && setWf(null)} onDone={afterWorkflow} />
    </div>
  );
}
