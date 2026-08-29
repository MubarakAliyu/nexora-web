"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Cash, Receipt, ChartLineUp, FileLines, Download, PenNib, TrashBin } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ExclamationCircle } from "flowbite-react-icons/outline";
import {
  paymentState, verifyPayment, rejectPayment,
  PAYMENT_STATE_LABEL, PAYMENT_STATE_STYLE,
} from "@/lib/api/payment-states";
import type { PaymentState } from "@/lib/mock/types";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { downloadPdf } from "@/lib/pdf/download";
import { invoicePdf, receiptPdf, statementPdf } from "@/lib/pdf/builders";
import { ownerOptions } from "@/lib/api/admin";
import { formatUGX, formatUGXFull, formatDate } from "@/lib/format";
import {
  listInvoices, listPayments, listExpenses, getFinanceSummary, createInvoice, updateInvoice, deleteInvoice,
  createExpense, updateExpense, deleteExpense,
  propertyName, tenantName, tenantOptions, propertyOptions,
  type Invoice, type InvoiceStatus, type Payment, type Expense, type ExpenseCategory, type Scope,
} from "@/lib/api/admin";

const EXPENSE_CATS: ExpenseCategory[] = ["maintenance", "utilities", "security", "cleaning", "admin", "insurance"];

/* ------------------------------------------------------------ invoices */

const invSchema = z.object({
  tenantId: z.string().min(1, "Choose a tenant"),
  kind: z.string().min(1),
  amount: z.number().int().min(10000, "Enter an amount"),
  due: z.string().min(1, "Choose a due date"),
});
type InvValues = z.infer<typeof invSchema>;

function GenerateInvoiceDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const tenants = React.useMemo(() => tenantOptions(), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InvValues>({
    resolver: zodResolver(invSchema), defaultValues: { tenantId: "", kind: "rent" },
  });
  const onSubmit = async (v: InvValues) => {
    await createInvoice({ tenantId: v.tenantId, amount: v.amount, due: new Date(v.due).toISOString(), kind: v.kind as Invoice["kind"] });
    toast.success("Invoice generated", { description: `${formatUGX(v.amount)} billed to ${tenantName(v.tenantId)}.` });
    reset(); setOpen(false); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> Generate invoice</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate an invoice</DialogTitle><DialogDescription>Bill a tenant for rent or services.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Tenant" htmlFor="gi-tenant" error={errors.tenantId?.message}>
            <select id="gi-tenant" className={selectClass} {...register("tenantId")} aria-invalid={!!errors.tenantId}>
              <option value="">Select…</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="gi-kind">
              <select id="gi-kind" className={selectClass} {...register("kind")}>
                <option value="rent">Rent</option><option value="service">Service</option>
                <option value="deposit">Deposit</option><option value="utility">Utility</option>
              </select>
            </Field>
            <Field label="Amount (UGX)" htmlFor="gi-amount" error={errors.amount?.message}>
              <Input id="gi-amount" type="number" {...register("amount", { valueAsNumber: true })} aria-invalid={!!errors.amount} />
            </Field>
          </div>
          <Field label="Due date" htmlFor="gi-due" error={errors.due?.message}>
            <Input id="gi-due" type="date" {...register("due")} aria-invalid={!!errors.due} />
          </Field>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Generate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceEditDialog({ invoice, onOpenChange, onDone }: { invoice: Invoice | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [status, setStatus] = React.useState<InvoiceStatus>("pending");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (invoice) setStatus(invoice.status); }, [invoice]);
  const save = async () => {
    if (!invoice) return;
    setBusy(true);
    try { await updateInvoice(invoice.id, { status }); toast.success("Invoice updated", { description: `${invoice.number} → ${status}.` }); onOpenChange(false); onDone(); }
    catch { toast.error("Couldn’t update invoice"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent>
        {invoice && (
          <>
            <DialogHeader><DialogTitle>Edit {invoice.number}</DialogTitle><DialogDescription>{tenantName(invoice.tenantId)} · {formatUGX(invoice.amount)}</DialogDescription></DialogHeader>
            <Field label="Status" htmlFor="ie-status">
              <select id="ie-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                <option value="pending">Pending</option><option value="paid">Paid</option>
                <option value="partial">Partially paid</option><option value="overdue">Overdue</option>
              </select>
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={save} loading={busy}>Save</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvoicesTab() {
  const [status, setStatus] = React.useState("all");
  const [editing, setEditing] = React.useState<Invoice | null>(null);
  const [deleting, setDeleting] = React.useState<Invoice | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listInvoices({ status }, scope), [status, scope]);
  const columns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", sortable: true, render: (i) => <span className="font-medium text-foreground">{i.number}</span> },
    { key: "tenantId", header: "Tenant", sortValue: (i) => tenantName(i.tenantId), render: (i) => tenantName(i.tenantId) },
    { key: "kind", header: "Type", render: (i) => <span className="capitalize">{i.kind}</span> },
    { key: "issued", header: "Issued", sortable: true, render: (i) => formatDate(i.issued) },
    { key: "due", header: "Due", sortable: true, render: (i) => formatDate(i.due) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (i) => formatUGX(i.amount) },
    { key: "status", header: "Status", sortable: true, render: (i) => <StatusBadge status={i.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (i) => (
        <RowActions actions={[
          { label: "View PDF", icon: <FileLines size={16} />, onClick: () => { const { payload, filename } = invoicePdf(i); downloadPdf(payload, filename); } },
          { label: "Edit status", icon: <PenNib size={16} />, onClick: () => setEditing(i) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(i), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <select className={`${selectClass} w-44`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter invoices by status">
          <option value="all">All statuses</option><option value="paid">Paid</option>
          <option value="pending">Pending</option><option value="overdue">Overdue</option><option value="partial">Partial</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton data={data ?? []} filename="invoices" columns={[
            { header: "Number", accessor: (i) => i.number },
            { header: "Tenant", accessor: (i) => tenantName(i.tenantId) },
            { header: "Property", accessor: (i) => propertyName(i.propertyId) },
            { header: "Kind", accessor: (i) => i.kind },
            { header: "Issued", accessor: (i) => i.issued.slice(0, 10) },
            { header: "Due", accessor: (i) => i.due.slice(0, 10) },
            { header: "Amount", accessor: (i) => i.amount },
            { header: "Paid", accessor: (i) => i.paid },
            { header: "Status", accessor: (i) => i.status },
          ]} />
          <GenerateInvoiceDialog onDone={reload} />
        </div>
      </div>
      <DataTable columns={columns} data={data ?? []} getRowId={(i) => i.id} loading={loading} error={error} onRetry={reload}
        emptyTitle="No invoices" emptyDescription="Generated invoices will appear here." pageSize={10} />
      <InvoiceEditDialog invoice={editing} onOpenChange={(o) => { if (!o) setEditing(null); }} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="invoice" entityName={deleting?.number ?? ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteInvoice(deleting.id); toast.success("Invoice deleted"); reload(); } catch { toast.error("Couldn’t delete invoice"); } }} />
    </div>
  );
}

/* ------------------------------------------------------------ payments */

function PaymentsTab() {
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listPayments(scope), [scope]);
  /* F2.2 — payment state filter + the manual verification queue. Only `successful`
     settles an invoice, so anything sitting in `requires_verification` is money we
     have been told about but have not confirmed. */
  const [stateFilter, setStateFilter] = React.useState<"all" | PaymentState>("all");
  const [verifying, setVerifying] = React.useState<Payment | null>(null);
  const [rejecting, setRejecting] = React.useState<Payment | null>(null);
  const [busy, setBusy] = React.useState(false);

  const all = data ?? [];
  const rows = stateFilter === "all" ? all : all.filter((p) => paymentState(p) === stateFilter);
  const total = rows.reduce((s, p) => s + p.amount, 0);
  const queueCount = all.filter((p) => paymentState(p) === "requires_verification").length;

  const doVerify = async (p: Payment) => {
    setBusy(true);
    try {
      await verifyPayment(p.id);
      toast.success("Payment verified", { description: `${p.reference} — invoice marked paid.` });
      setVerifying(null); reload();
    } catch { toast.error("Couldn’t verify the payment"); }
    finally { setBusy(false); }
  };
  const columns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "tenantId", header: "Tenant", sortValue: (p) => tenantName(p.tenantId), render: (p) => tenantName(p.tenantId) },
    { key: "propertyId", header: "Property", render: (p) => propertyName(p.propertyId) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatUGX(p.amount) },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
    { key: "reference", header: "Reference", render: (p) => <span className="text-muted">{p.reference}</span> },
    {
      key: "state", header: "Payment state", sortable: true,
      sortValue: (p) => paymentState(p),
      render: (p) => {
        const st = paymentState(p);
        return (
          <span>
            <Badge className={PAYMENT_STATE_STYLE[st]}>{PAYMENT_STATE_LABEL[st]}</Badge>
            {p.failureReason && <span className="mt-0.5 block text-caption text-muted">{p.failureReason}</span>}
          </span>
        );
      },
    },
    {
      key: "actions", header: "", align: "right",
      render: (p) => {
        const st = paymentState(p);
        return (
          <RowActions actions={[
            ...(st === "requires_verification"
              ? [
                  { label: "Verify payment", icon: <CheckCircle size={16} />, onClick: () => setVerifying(p) },
                  { label: "Reject payment", onClick: () => setRejecting(p), danger: true },
                ]
              : []),
            { label: "Receipt PDF", icon: <FileLines size={16} />, onClick: () => { const { payload, filename } = receiptPdf(p); downloadPdf(payload, filename); }, separatorBefore: st === "requires_verification" },
          ]} />
        );
      },
    },
  ];
  return (
    <div>
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-caption uppercase tracking-wide text-muted">Total received (reconciled)</p>
          <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatUGXFull(total)}</p>
        </div>
        <ExportCsvButton data={data ?? []} filename="payments" columns={[
          { header: "Date", accessor: (p) => p.date.slice(0, 10) },
          { header: "Tenant", accessor: (p) => tenantName(p.tenantId) },
          { header: "Property", accessor: (p) => propertyName(p.propertyId) },
          { header: "Amount", accessor: (p) => p.amount },
          { header: "Method", accessor: (p) => p.method },
          { header: "Reference", accessor: (p) => p.reference },
          { header: "Status", accessor: (p) => p.status },
          { header: "Payment state", accessor: (p) => paymentState(p) },
          { header: "Provider reference", accessor: (p) => p.providerReference ?? "" },
        ]} />
      </Card>

      {queueCount > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-accent p-4">
          <div className="flex items-start gap-3">
            <ExclamationCircle size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-body font-medium text-foreground">
                {queueCount} payment{queueCount === 1 ? "" : "s"} awaiting verification
              </p>
              <p className="mt-0.5 text-caption text-muted">
                Their invoices stay unpaid until someone confirms the money arrived.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStateFilter("requires_verification")}>
            Review queue
          </Button>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <select className={`${selectClass} sm:w-56`} value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)} aria-label="Filter by payment state">
          <option value="all">All payment states</option>
          {(Object.keys(PAYMENT_STATE_LABEL) as PaymentState[]).map((st) => (
            <option key={st} value={st}>{PAYMENT_STATE_LABEL[st]}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(p) => p.id} loading={loading} error={error} onRetry={reload}
        emptyTitle="No payments" emptyDescription="Received payments will appear here." pageSize={10} />

      {/* Verify */}
      <Dialog open={!!verifying} onOpenChange={(o) => !o && setVerifying(null)}>
        <DialogContent>
          {verifying && (
            <>
              <DialogHeader>
                <DialogTitle>Verify payment</DialogTitle>
                <DialogDescription>{verifying.reference} · {tenantName(verifying.tenantId)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 rounded-xl border border-border p-4 text-body">
                <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-medium text-foreground">{formatUGXFull(verifying.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Method</span><span className="capitalize text-foreground">{verifying.method.replace("_", " ")}</span></div>
                {verifying.providerReference && <div className="flex justify-between"><span className="text-muted">Provider ref</span><span className="font-mono text-foreground">{verifying.providerReference}</span></div>}
              </div>
              <p className="text-caption text-muted">
                Confirming marks the linked invoice paid and notifies the customer.
              </p>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button loading={busy} onClick={() => doVerify(verifying)}>Confirm payment received</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RejectPaymentDialog payment={rejecting} onOpenChange={(o) => !o && setRejecting(null)} onDone={reload} />
    </div>
  );
}

/** Rejecting leaves the invoice unpaid — that is the point. */
function RejectPaymentDialog({ payment, onOpenChange, onDone }: {
  payment: Payment | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (payment) setReason(""); }, [payment]);

  const submit = async () => {
    if (!payment || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await rejectPayment(payment.id, reason.trim());
      toast.success("Payment rejected", { description: "The invoice remains unpaid." });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t reject the payment"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent>
        {payment && (
          <>
            <DialogHeader>
              <DialogTitle>Reject payment</DialogTitle>
              <DialogDescription>{payment.reference}</DialogDescription>
            </DialogHeader>
            <Field label="Reason" htmlFor="rp-reason" error={reason.trim().length >= 5 ? undefined : "Required"}>
              <Textarea id="rp-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. No matching transaction found at the provider" />
              <p className="mt-1 text-caption text-muted">The customer is notified and the invoice stays unpaid.</p>
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button loading={busy} disabled={reason.trim().length < 5} onClick={submit}>Reject payment</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ expenses */

const expSchema = z.object({
  propertyId: z.string().min(1, "Choose a property"),
  category: z.string().min(1),
  vendor: z.string().min(2, "Enter a vendor"),
  amount: z.number().int().min(1000, "Enter an amount"),
  description: z.string().min(2, "Enter a description"),
});
type ExpValues = z.infer<typeof expSchema>;

function ExpenseFormDialog({ open, onOpenChange, editing, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Expense | null; onDone: () => void;
}) {
  const isEdit = !!editing;
  const props = React.useMemo(() => propertyOptions(), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExpValues>({
    resolver: zodResolver(expSchema), defaultValues: { propertyId: "", category: "maintenance", vendor: "", amount: 100000, description: "" },
  });
  React.useEffect(() => {
    if (open) reset(editing
      ? { propertyId: editing.propertyId, category: editing.category, vendor: editing.vendor, amount: editing.amount, description: editing.description }
      : { propertyId: "", category: "maintenance", vendor: "", amount: 100000, description: "" });
  }, [open, editing, reset]);
  const onSubmit = async (v: ExpValues) => {
    try {
      if (isEdit && editing) { await updateExpense(editing.id, { propertyId: v.propertyId, category: v.category as ExpenseCategory, vendor: v.vendor, amount: v.amount, description: v.description }); toast.success("Expense updated", { description: `${v.vendor} saved.` }); }
      else { await createExpense({ propertyId: v.propertyId, category: v.category as ExpenseCategory, vendor: v.vendor, amount: v.amount, description: v.description }); toast.success("Expense logged", { description: `${formatUGX(v.amount)} — ${v.vendor}.` }); }
      onOpenChange(false); onDone();
    } catch { toast.error(isEdit ? "Couldn’t update expense" : "Couldn’t log expense"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit expense" : "Log an expense"}</DialogTitle><DialogDescription>Record a cost against a property.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Property" htmlFor="le-prop" error={errors.propertyId?.message}>
            <select id="le-prop" className={selectClass} {...register("propertyId")} aria-invalid={!!errors.propertyId}>
              <option value="">Select…</option>
              {props.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="le-cat">
              <select id="le-cat" className={`${selectClass} capitalize`} {...register("category")}>
                {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount (UGX)" htmlFor="le-amount" error={errors.amount?.message}>
              <Input id="le-amount" type="number" {...register("amount", { valueAsNumber: true })} aria-invalid={!!errors.amount} />
            </Field>
          </div>
          <Field label="Vendor" htmlFor="le-vendor" error={errors.vendor?.message}>
            <Input id="le-vendor" {...register("vendor")} aria-invalid={!!errors.vendor} />
          </Field>
          <Field label="Description" htmlFor="le-desc" error={errors.description?.message}>
            <Input id="le-desc" {...register("description")} aria-invalid={!!errors.description} />
          </Field>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Log expense"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpensesTab() {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listExpenses(scope), [scope]);
  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
    { key: "propertyId", header: "Property", sortValue: (e) => propertyName(e.propertyId), render: (e) => propertyName(e.propertyId) },
    { key: "category", header: "Category", sortable: true, render: (e) => <span className="capitalize">{e.category}</span> },
    { key: "vendor", header: "Vendor", render: (e) => e.vendor },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (e) => formatUGX(e.amount) },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (e) => (
        <RowActions actions={[
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditing(e); setFormOpen(true); } },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(e), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <ExportCsvButton data={data ?? []} filename="expenses" columns={[
          { header: "Date", accessor: (e) => e.date.slice(0, 10) },
          { header: "Property", accessor: (e) => propertyName(e.propertyId) },
          { header: "Category", accessor: (e) => e.category },
          { header: "Vendor", accessor: (e) => e.vendor },
          { header: "Description", accessor: (e) => e.description },
          { header: "Amount", accessor: (e) => e.amount },
          { header: "Status", accessor: (e) => e.status },
        ]} />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Log expense</Button>
      </div>
      <DataTable columns={columns} data={data ?? []} getRowId={(e) => e.id} loading={loading} error={error} onRetry={reload}
        emptyTitle="No expenses" emptyDescription="Logged expenses will appear here." pageSize={10} />
      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="expense" entityName={deleting ? `${deleting.vendor} — ${formatUGX(deleting.amount)}` : ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteExpense(deleting.id); toast.success("Expense deleted"); reload(); } catch { toast.error("Couldn’t delete expense"); } }} />
    </div>
  );
}

/* ------------------------------------------------------------- reports */

function ReportsTab() {
  const owners = React.useMemo(() => ownerOptions(), []);
  const [type, setType] = React.useState("owner-statements");
  const [ownerId, setOwnerId] = React.useState(owners[0]?.id ?? "");
  const [to, setTo] = React.useState("2026-07-01");
  const period = new Date(to).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const generate = () => {
    const { payload, filename } = statementPdf(ownerId, period);
    downloadPdf(payload, filename);
  };
  const recent = [
    { name: "Owner statement — Salim Kato", date: "1 Jul 2026" },
    { name: "Owner statement — Rehema Ssali", date: "1 Jul 2026" },
    { name: "Owner statement — Diana Achieng", date: "3 Jun 2026" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-heading text-h3 font-semibold text-foreground">Generate a report</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Report type" htmlFor="rp-type">
            <select id="rp-type" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="owner-statements">Owner statement</option>
              <option value="rent-roll">Rent roll</option>
              <option value="collections">Collections</option>
              <option value="arrears">Arrears</option>
            </select>
          </Field>
          <Field label="Owner" htmlFor="rp-owner">
            <select id="rp-owner" className={selectClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Period ending" htmlFor="rp-to"><Input id="rp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Button className="mt-5 gap-2" onClick={generate}><Download size={18} /> Generate PDF</Button>
      </Card>
      <Card className="p-6">
        <h3 className="mb-4 font-heading text-h3 font-semibold text-foreground">Recent reports</h3>
        <ul className="space-y-2">
          {recent.map((r, i) => (
            <li key={r.name}>
              <button type="button" onClick={() => { const { payload, filename } = statementPdf(owners[i % owners.length]?.id ?? ownerId); downloadPdf(payload, filename); }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface-hover">
                <FileLines size={18} className="text-muted" />
                <span className="flex-1"><span className="block text-body text-foreground">{r.name}</span><span className="block text-caption text-muted">{r.date}</span></span>
                <Download size={16} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- page */

export default function FinancePage() {
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const summary = useAsync(() => getFinanceSummary(scope), [scope]);

  return (
    <div>
      <PageHeader title="Finance" subtitle="Invoices, payments, expenses and reports" />

      {summary.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-28" /></Card>)}
        </div>
      ) : summary.error ? (
        <EmptyState title="Couldn’t load finance summary" description={summary.error} action={<Button variant="outline" size="sm" onClick={summary.reload}>Try again</Button>} />
      ) : summary.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Billed" value={formatUGX(summary.data.billed)} icon={<Receipt size={22} />} />
          <StatCard label="Collected" value={formatUGX(summary.data.collected)} icon={<Cash size={22} />} />
          <StatCard label="Outstanding" value={formatUGX(summary.data.outstanding)} icon={<ChartLineUp size={22} />} hint="pending + overdue" />
          <StatCard label="Expenses" value={formatUGX(summary.data.expenses)} icon={<FileLines size={22} />} />
        </div>
      ) : null}

      <div className="mt-6">
        <Tabs defaultValue="invoices">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="invoices"><InvoicesTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="expenses"><ExpensesTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
