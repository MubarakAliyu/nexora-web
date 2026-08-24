"use client";

import * as React from "react";
import { CheckCircle, MobilePhone, CreditCardPlus, Landmark, Download, Tools } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatUGX, formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { receiptPdf, maintenanceInvoicePdf } from "@/lib/pdf/builders";
import { payInvoice, type Invoice, type Payment, type PaymentMethod } from "@/lib/api/admin";
import { payMaintenanceCharge } from "@/lib/api/maintenance-liability";
import type { MaintenanceTicket } from "@/lib/mock/types";

const METHODS: { id: PaymentMethod; label: string; hint: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "mobile_money", label: "Mobile Money", hint: "MTN / Airtel", Icon: MobilePhone },
  { id: "card", label: "Debit / Credit Card", hint: "Visa / Mastercard", Icon: CreditCardPlus },
  { id: "bank", label: "Bank Transfer", hint: "Direct deposit", Icon: Landmark },
];

type Step = "method" | "processing" | "confirmed";

/**
 * The tenant payment flow — method → processing → confirmation — shared by rent
 * invoices and maintenance charges. It was the Pay Rent dialog; E4 generalised
 * it rather than cloning it, so a tenant pays a maintenance charge through the
 * exact same three steps they already know.
 */
export function PayChargeDialog({ invoice, ticket, onOpenChange, onDone }: {
  invoice?: Invoice | null;
  /** Tenant-liable maintenance charge. Mutually exclusive with `invoice`. */
  ticket?: MaintenanceTicket | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [step, setStep] = React.useState<Step>("method");
  const [method, setMethod] = React.useState<PaymentMethod>("mobile_money");
  const [payment, setPayment] = React.useState<Payment | null>(null);
  const [maintPaid, setMaintPaid] = React.useState<MaintenanceTicket | null>(null);

  const open = !!invoice || !!ticket;
  React.useEffect(() => {
    if (open) { setStep("method"); setMethod("mobile_money"); setPayment(null); setMaintPaid(null); }
  }, [open, invoice, ticket]);

  const due = invoice ? invoice.amount - invoice.paid : ticket ? (ticket.invoiceAmount ?? ticket.cost ?? 0) : 0;
  const title = ticket ? "Pay maintenance charge" : "Pay rent";
  const subtitle = ticket
    ? `${ticket.invoiceNumber} · due ${ticket.invoiceDueDate ? formatDate(ticket.invoiceDueDate) : "on receipt"}`
    : invoice ? `${invoice.number} · due ${formatDate(invoice.due)}` : "";

  const pay = async () => {
    setStep("processing");
    try {
      if (ticket) {
        const reference = `MPY-${Date.now().toString().slice(-8)}`;
        const t = await payMaintenanceCharge(ticket.id, { amount: due, method, reference });
        setMaintPaid(t);
        toast.success("Payment successful", { description: `Reference ${reference}` });
      } else if (invoice) {
        const p = await payInvoice({ invoiceId: invoice.id, method });
        setPayment(p);
        toast.success("Payment successful", { description: `Reference ${p.reference}` });
      }
      setStep("confirmed");
      onDone();
    } catch {
      toast.error("Payment failed", { description: "Please try again." });
      setStep("method");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && step === "method" && (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>
            {ticket && (
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-hover p-3">
                <Tools size={18} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground">{ticket.title}</p>
                  <p className="text-caption text-muted">{ticket.liabilityReason}</p>
                </div>
              </div>
            )}
            <div className="mt-3 rounded-xl bg-surface-hover p-4 text-center">
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

        {step === "confirmed" && (payment || maintPaid) && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><CheckCircle size={36} className="text-primary" /></span>
            <h3 className="mt-5 font-heading text-h2 font-semibold text-foreground">Payment successful</h3>
            <p className="mt-2 text-body text-muted">
              {maintPaid ? "Your maintenance charge has been settled. A receipt is available below." : "Your rent payment has been received. A receipt is available below."}
            </p>
            <div className="mt-5 w-full space-y-2 rounded-xl border border-border bg-surface-hover p-4 text-left text-body">
              <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-semibold text-foreground">{maintPaid?.paymentReference ?? payment?.reference}</span></div>
              <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-semibold text-foreground">{formatUGX(maintPaid?.paidAmount ?? payment?.amount ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Method</span><span className="capitalize text-foreground">{(maintPaid?.paymentMethod ?? payment?.method ?? "").replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Date</span><span className="text-foreground">{formatDate(maintPaid?.paidAt ?? payment?.date ?? "")}</span></div>
            </div>
            <div className="mt-5 flex w-full gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                const { payload, filename } = maintPaid ? maintenanceInvoicePdf(maintPaid.id) : receiptPdf(payment!);
                downloadPdf(payload, filename);
              }}><Download size={16} /> Receipt</Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
