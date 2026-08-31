"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cash, Receipt, CreditCardPlus, CheckCircle, ArrowRight, Download,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { receiptPdf, maintenanceInvoicePdf } from "@/lib/pdf/builders";
import { getTenant, type Invoice, type Payment, type Scope } from "@/lib/api/admin";
import { PayChargeDialog } from "@/components/tenant/pay-charge-dialog";
import { tenantMaintenanceInvoices } from "@/lib/api/maintenance-liability";
import type { MaintenanceTicket } from "@/lib/mock/types";

export default function TenantPaymentsPage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const [paying, setPaying] = React.useState<Invoice | null>(null);
  const [payingCharge, setPayingCharge] = React.useState<MaintenanceTicket | null>(null);

  // Only skeleton on FIRST load — a background refetch (live-revision bump after
  // a payment) must not unmount the Pay-Rent dialog mid-flow.
  if (loading && !data) {
    return <div><Skeleton className="h-6 w-40" /><div className="mt-6 grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-24" /></Card>)}</div></div>;
  }
  if (error || !data) {
    return <EmptyState icon={<Cash size={22} />} title="Couldn’t load payments" description={error ?? "Please try again."} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />;
  }

  const { lease, invoices, payments } = data;
  const unpaid = invoices.filter((i) => i.status !== "paid").sort((a, b) => (a.due < b.due ? -1 : 1));
  const outstanding = unpaid.reduce((s, i) => s + (i.amount - i.paid), 0);
  const nextDue = unpaid[0];
  const totalPaid = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  const invoiceColumns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", sortable: true, render: (i) => <span className="font-medium text-foreground">{i.number}</span> },
    { key: "due", header: "Due", sortable: true, render: (i) => formatDate(i.due) },
    { key: "amount", header: "Amount", align: "right", render: (i) => formatCurrency(i.amount - i.paid) },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "pay", header: "", align: "right", render: (i) => <Button size="sm" onClick={() => setPaying(i)}>Pay</Button> },
  ];

  const charges = tenantMaintenanceInvoices(tenantId);
  const chargeColumns: Column<MaintenanceTicket>[] = [
    { key: "invoiceNumber", header: "Invoice", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.invoiceNumber}</span> },
    { key: "title", header: "Work", render: (t) => t.title },
    { key: "invoiceDueDate", header: "Due", sortable: true, render: (t) => (t.invoiceDueDate ? formatDate(t.invoiceDueDate) : "—") },
    { key: "invoiceAmount", header: "Amount", align: "right", render: (t) => formatCurrency(t.invoiceAmount ?? t.cost ?? 0) },
    { key: "paymentStatus", header: "Status", render: (t) => <StatusBadge status={t.paymentStatus === "paid" ? "paid" : "awaiting_payment"} /> },
    {
      key: "act", header: "", align: "right",
      render: (t) => t.paymentStatus === "awaiting_payment"
        ? <Button size="sm" onClick={() => setPayingCharge(t)}>Pay</Button>
        : <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { const { payload, filename } = maintenanceInvoicePdf(t.id); downloadPdf(payload, filename); }}><Download size={15} /> Receipt</Button>,
    },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatCurrency(p.amount, p.currency) },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
    { key: "reference", header: "Reference", render: (p) => <span className="text-caption text-muted">{p.reference}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "receipt", header: "", align: "right", render: (p) => <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { const { payload, filename } = receiptPdf(p); downloadPdf(payload, filename); }}><Download size={15} /> Receipt</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Rent & Payments"
        subtitle="Your balance, payment history and receipts"
        actions={nextDue ? <Button className="gap-2" onClick={() => setPaying(nextDue)}><CreditCardPlus size={18} /> Pay rent</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current balance" value={formatCurrency(outstanding)} icon={<Receipt size={22} />} hint={outstanding > 0 ? "due now" : "all settled"} />
        <StatCard label="Next due" value={nextDue ? formatDate(nextDue.due) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Monthly rent" value={lease ? formatCurrency(lease.rent) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Total paid" value={formatCurrency(totalPaid)} icon={<CheckCircle size={22} />} hint="to date" />
      </div>

      {/* Pay banner */}
      {nextDue && (
        <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-l-4 border-primary p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted">Outstanding balance</p>
            <p className="mt-1 font-heading text-h1 font-semibold text-foreground">{formatCurrency(outstanding)}</p>
            <p className="mt-1 text-body text-muted">{unpaid.length} unpaid invoice{unpaid.length === 1 ? "" : "s"} · next due {formatDate(nextDue.due)}</p>
          </div>
          <Button className="gap-2" onClick={() => setPaying(nextDue)}>Pay now <ArrowRight size={16} /></Button>
        </Card>
      )}

      {/* Outstanding invoices */}
      {unpaid.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Outstanding invoices</h2>
          <DataTable columns={invoiceColumns} data={unpaid} getRowId={(i) => i.id} emptyTitle="Nothing due" emptyDescription="You're all settled." pageSize={6} />
        </section>
      )}

      {/* Maintenance charges — separate from rent, because they are a different
          obligation with their own invoice and their own due date. */}
      {charges.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Maintenance charges</h2>
          <DataTable columns={chargeColumns} data={charges} getRowId={(t) => t.id}
            emptyTitle="No maintenance charges" emptyDescription="Charges you're responsible for will show here." pageSize={6} />
        </section>
      )}

      {/* Payment history */}
      <section className="mt-8">
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Payment history</h2>
        <DataTable columns={paymentColumns} data={payments} getRowId={(p) => p.id} emptyTitle="No payments yet" emptyDescription="Your payments will show here." pageSize={10} />
      </section>

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>

      <PayChargeDialog invoice={paying} ticket={payingCharge} onOpenChange={(o) => { if (!o) { setPaying(null); setPayingCharge(null); } }} onDone={reload} />
    </div>
  );
}
