"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cash, Receipt, CreditCardPlus, CheckCircle, MobilePhone, Wallet, ArrowRight, Download,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatUGX, formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { receiptPdf } from "@/lib/pdf/builders";
import { getTenant, payInvoice, type Invoice, type Payment, type PaymentMethod, type Scope } from "@/lib/api/admin";

const METHODS: { id: PaymentMethod; label: string; hint: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "mobile_money", label: "Mobile Money", hint: "MTN / Airtel", Icon: MobilePhone },
  { id: "card", label: "Debit / Credit Card", hint: "Visa / Mastercard", Icon: CreditCardPlus },
  { id: "bank", label: "Bank Transfer", hint: "Direct deposit", Icon: Wallet },
];

type Step = "method" | "processing" | "confirmed";

function PayRentDialog({ invoice, onOpenChange, onDone }: { invoice: Invoice | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [step, setStep] = React.useState<Step>("method");
  const [method, setMethod] = React.useState<PaymentMethod>("mobile_money");
  const [payment, setPayment] = React.useState<Payment | null>(null);

  React.useEffect(() => { if (invoice) { setStep("method"); setMethod("mobile_money"); setPayment(null); } }, [invoice]);

  const due = invoice ? invoice.amount - invoice.paid : 0;

  const pay = async () => {
    if (!invoice) return;
    setStep("processing");
    try {
      const p = await payInvoice({ invoiceId: invoice.id, method });
      setPayment(p);
      setStep("confirmed");
      toast.success("Payment successful", { description: `Reference ${p.reference}` });
      onDone();
    } catch {
      toast.error("Payment failed", { description: "Please try again." });
      setStep("method");
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent>
        {invoice && step === "method" && (
          <>
            <DialogHeader>
              <DialogTitle>Pay rent</DialogTitle>
              <DialogDescription>{invoice.number} · due {formatDate(invoice.due)}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-surface-hover p-4 text-center">
              <p className="text-caption uppercase tracking-wide text-muted">Amount due</p>
              <p className="mt-1 font-heading text-h1 font-semibold text-primary">{formatUGX(due)}</p>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-caption font-medium uppercase tracking-wide text-muted">Payment method</p>
              {METHODS.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  aria-pressed={method === id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    method === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <Icon size={22} className={method === id ? "text-primary" : "text-muted"} />
                  <span className="flex-1"><span className="block font-medium text-foreground">{label}</span><span className="text-caption text-muted">{hint}</span></span>
                  {method === id && <CheckCircle size={18} className="text-primary" />}
                </button>
              ))}
            </div>
            <Button className="mt-5 w-full" onClick={pay}>Pay {formatUGX(due)}</Button>
            <p className="mt-2 text-center text-caption text-muted">Simulated payment — no real charge is made.</p>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-surface-active border-t-primary" />
            <p className="mt-5 font-heading text-h3 font-semibold text-foreground">Redirecting to gateway…</p>
            <p className="mt-1 text-body text-muted">Securely processing your payment.</p>
          </div>
        )}

        {step === "confirmed" && payment && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><CheckCircle size={36} className="text-primary" /></span>
            <h3 className="mt-5 font-heading text-h2 font-semibold text-foreground">Payment successful</h3>
            <p className="mt-2 text-body text-muted">Your rent payment has been received. A receipt is available below.</p>
            <div className="mt-5 w-full space-y-2 rounded-xl border border-border bg-surface-hover p-4 text-left text-body">
              <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-semibold text-foreground">{payment.reference}</span></div>
              <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-semibold text-foreground">{formatUGX(payment.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Method</span><span className="capitalize text-foreground">{payment.method.replace("_", " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Date</span><span className="text-foreground">{formatDate(payment.date)}</span></div>
            </div>
            <div className="mt-5 flex w-full gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => { const { payload, filename } = receiptPdf(payment); downloadPdf(payload, filename); }}><Download size={16} /> Receipt</Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TenantPaymentsPage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const [paying, setPaying] = React.useState<Invoice | null>(null);

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
    { key: "amount", header: "Amount", align: "right", render: (i) => formatUGX(i.amount - i.paid) },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "pay", header: "", align: "right", render: (i) => <Button size="sm" onClick={() => setPaying(i)}>Pay</Button> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatUGX(p.amount) },
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
        <StatCard label="Current balance" value={formatUGX(outstanding)} icon={<Receipt size={22} />} hint={outstanding > 0 ? "due now" : "all settled"} />
        <StatCard label="Next due" value={nextDue ? formatDate(nextDue.due) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Monthly rent" value={lease ? formatUGX(lease.rent) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Total paid" value={formatUGX(totalPaid)} icon={<CheckCircle size={22} />} hint="to date" />
      </div>

      {/* Pay banner */}
      {nextDue && (
        <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-l-4 border-primary p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted">Outstanding balance</p>
            <p className="mt-1 font-heading text-h1 font-semibold text-foreground">{formatUGX(outstanding)}</p>
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

      {/* Payment history */}
      <section className="mt-8">
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Payment history</h2>
        <DataTable columns={paymentColumns} data={payments} getRowId={(p) => p.id} emptyTitle="No payments yet" emptyDescription="Your payments will show here." pageSize={10} />
      </section>

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>

      <PayRentDialog invoice={paying} onOpenChange={(o) => !o && setPaying(null)} onDone={reload} />
    </div>
  );
}
