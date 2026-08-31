"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { serviceStaffFor } from "@/lib/api/admin";
import {
  recordAssessment, generateServiceInvoice, recordServicePayment,
  markServiceCompleted, confirmServiceCompletion, rejectServiceCompletion, cancelServiceBooking,
} from "@/lib/api/service-lifecycle";
import type { ServiceBooking } from "@/lib/mock/types";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/* ------------------------------------------------------------ assessment */

const assessSchema = z.object({
  assessedBy: z.string().min(1, "Choose who assessed the job"),
  assessedAt: z.string().min(1, "Choose the assessment date"),
  scope: z.string().min(10, "Describe the scope you found on site"),
  amount: z.coerce.number().positive("Enter the quoted amount"),
  notes: z.string().optional(),
});
type AssessValues = z.input<typeof assessSchema>;

export function AssessmentDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const staff = React.useMemo(
    () => (booking ? serviceStaffFor(booking.kind, booking.category) : []),
    [booking],
  );
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AssessValues>({
    resolver: zodResolver(assessSchema),
    defaultValues: { assessedBy: "", assessedAt: today(), scope: "", amount: "" as unknown as number, notes: "" },
  });
  React.useEffect(() => {
    if (booking) reset({ assessedBy: booking.assignee ?? "", assessedAt: today(), scope: "", amount: "" as unknown as number, notes: "" });
  }, [booking, reset]);

  const onSubmit = async (v: AssessValues) => {
    if (!booking) return;
    try {
      await recordAssessment(booking.id, {
        assessedBy: v.assessedBy, assessedAt: v.assessedAt, scope: v.scope,
        amount: Number(v.amount), notes: v.notes,
      });
      toast.success(`Assessment recorded — ${formatCurrency(Number(v.amount))} quoted for ${booking.category}`);
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t record the assessment"); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Record Assessment — {booking.reference}</DialogTitle>
              <DialogDescription>
                {booking.category} for {booking.name}. Pricing comes from what the job actually is, so
                describe the scope you found on site.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Assessed by" htmlFor="as-by" error={errors.assessedBy?.message}>
                  <select id="as-by" className={selectClass} {...register("assessedBy")} aria-invalid={!!errors.assessedBy}>
                    <option value="">Select…</option>
                    {staff.map((s) => <option key={s.id} value={s.name}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Assessment date" htmlFor="as-date" error={errors.assessedAt?.message}>
                  <Input id="as-date" type="date" {...register("assessedAt")} aria-invalid={!!errors.assessedAt} />
                </Field>
              </div>
              <Field label="Scope description" htmlFor="as-scope" error={errors.scope?.message}>
                <Textarea id="as-scope" rows={3}
                  placeholder="e.g. 5-bedroom bungalow, deep clean including kitchen and 3 bathrooms, 2 floors"
                  {...register("scope")} aria-invalid={!!errors.scope} />
              </Field>
              <Field label="Quoted amount (UGX)" htmlFor="as-amt" error={errors.amount?.message}>
                <Input id="as-amt" type="number" min={1} {...register("amount")} aria-invalid={!!errors.amount} />
              </Field>
              <Field label="Assessment notes (optional)" htmlFor="as-notes">
                <Textarea id="as-notes" rows={2} {...register("notes")} />
              </Field>
              <Field label="Photos" htmlFor="as-photos">
                <input id="as-photos" type="file" accept="image/*" multiple
                  className="block w-full text-caption text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-active file:px-3 file:py-1.5 file:text-caption file:text-foreground" />
              </Field>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" loading={isSubmitting}>Record assessment</Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- invoice */

export function InvoiceDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const assessed = booking?.assessedAmount ?? 0;
  const [amount, setAmount] = React.useState(assessed);
  const [reason, setReason] = React.useState("");
  const [due, setDue] = React.useState(plusDays(7));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (booking) { setAmount(booking.assessedAmount ?? 0); setReason(""); setDue(plusDays(7)); }
  }, [booking]);

  const adjusted = booking ? amount !== (booking.assessedAmount ?? 0) : false;
  const valid = amount > 0 && (!adjusted || reason.trim().length > 3);

  const submit = async () => {
    if (!booking || !valid) return;
    setBusy(true);
    try {
      const sb = await generateServiceInvoice(booking.id, {
        amount, adjustmentReason: adjusted ? reason : undefined, dueDate: due,
      });
      toast.success(`Invoice ${sb.invoiceNumber} generated — ${formatCurrency(amount)}`);
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t generate the invoice"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Generate Invoice — {booking.reference}</DialogTitle>
              <DialogDescription>
                Invoice number will be {booking.reference.replace("NX-SV-", "INV-SV-")}, derived from the booking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <dl className="space-y-1.5 rounded-xl border border-border p-4 text-caption">
                <div className="flex justify-between gap-4"><dt className="text-muted">Client</dt><dd className="text-right text-foreground">{booking.name} · {booking.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Service</dt><dd className="text-foreground">{booking.category}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Assessed scope</dt><dd className="max-w-[62%] text-right text-foreground">{booking.assessmentScope ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Assessed amount</dt><dd className="font-medium text-foreground">{formatCurrency(assessed)}</dd></div>
              </dl>
              <Field label="Invoice amount (UGX)" htmlFor="iv-amt">
                <Input id="iv-amt" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Field>
              {adjusted && (
                <div className="motion-safe:animate-in motion-safe:fade-in">
                  <Field label="Adjustment reason" htmlFor="iv-reason" error={reason.trim().length > 3 ? undefined : "Required when the amount differs from the assessment"}>
                    <Textarea id="iv-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Discount applied for repeat customer" />
                  </Field>
                </div>
              )}
              <Field label="Due date" htmlFor="iv-due">
                <Input id="iv-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!valid}>Generate invoice</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- payment */

export function PaymentDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const total = booking?.invoiceAmount ?? booking?.assessedAmount ?? 0;
  const already = booking?.paidAmount ?? 0;
  const outstanding = Math.max(0, total - already);
  const [amount, setAmount] = React.useState(outstanding);
  const [method, setMethod] = React.useState("mobile_money");
  const [reference, setReference] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (booking) {
      setAmount(Math.max(0, (booking.invoiceAmount ?? booking.assessedAmount ?? 0) - (booking.paidAmount ?? 0)));
      setMethod("mobile_money"); setReference(""); setDate(today());
    }
  }, [booking]);

  const tooMuch = amount > outstanding;
  const valid = amount > 0 && !tooMuch && reference.trim().length > 2;

  const submit = async () => {
    if (!booking || !valid) return;
    setBusy(true);
    try {
      await recordServicePayment(booking.id, { amount, method, reference, date });
      toast.success(`Payment recorded — ${formatCurrency(amount)} for ${booking.reference}`);
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t record the payment"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Record Payment — {booking.reference}</DialogTitle>
              <DialogDescription>
                Invoice {booking.invoiceNumber} · {formatCurrency(total)}
                {already > 0 ? ` · ${formatCurrency(already)} already received` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount (UGX)" htmlFor="pm-amt" error={tooMuch ? `Cannot exceed the outstanding ${formatCurrency(outstanding)}` : undefined}>
                  <Input id="pm-amt" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-invalid={tooMuch} />
                </Field>
                <Field label="Payment method" htmlFor="pm-method">
                  <select id="pm-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </Field>
                <Field label="Payment reference" htmlFor="pm-ref" error={reference.trim().length > 2 ? undefined : "Enter the transaction reference"}>
                  <Input id="pm-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. MM-8842190" />
                </Field>
                <Field label="Payment date" htmlFor="pm-date">
                  <Input id="pm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>
              {amount > 0 && amount < outstanding && (
                <p className="rounded-lg bg-surface-hover p-3 text-caption text-muted motion-safe:animate-in motion-safe:fade-in">
                  Part payment — balance of {formatCurrency(outstanding - amount)} will remain outstanding.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!valid}>Record payment</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ completion */

export function CompletionDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (booking) setNotes(""); }, [booking]);

  const submit = async () => {
    if (!booking || notes.trim().length < 5) return;
    setBusy(true);
    try {
      await markServiceCompleted(booking.id, { notes, completedBy: booking.assignee });
      toast.success("Marked completed — awaiting manager confirmation");
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t mark as completed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent>
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Mark Completed — {booking.reference}</DialogTitle>
              <DialogDescription>Record what was done. A property manager confirms before the job closes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="Completed by" htmlFor="cp-by"><Input id="cp-by" value={booking.assignee ?? "Unassigned"} disabled /></Field>
              <Field label="Completion notes" htmlFor="cp-notes" error={notes.trim().length >= 5 ? undefined : "Describe what was done"}>
                <Textarea id="cp-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Full deep clean completed across both floors; client walked through and signed off." />
              </Field>
              <Field label="Completion photos" htmlFor="cp-photos">
                <input id="cp-photos" type="file" accept="image/*" multiple
                  className="block w-full text-caption text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-active file:px-3 file:py-1.5 file:text-caption file:text-foreground" />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={notes.trim().length < 5}>Mark completed</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------- manager confirmation */

export function ConfirmCompletionDialog({ booking, onOpenChange, onDone, confirmedBy }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void; confirmedBy: string;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (booking) { setRejecting(false); setReason(""); } }, [booking]);

  const confirm = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await confirmServiceCompletion(booking.id, confirmedBy);
      toast.success(`Job confirmed — ${booking.reference}`);
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t confirm"); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    if (!booking || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await rejectServiceCompletion(booking.id, reason);
      toast.success("Completion rejected — sent back to the assignee");
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t reject"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent>
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Completion — {booking.reference}</DialogTitle>
              <DialogDescription>Verify the work before the job is closed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <dl className="space-y-1.5 rounded-xl border border-border p-4 text-caption">
                <div className="flex justify-between gap-4"><dt className="text-muted">Completed by</dt><dd className="text-foreground">{booking.completedBy ?? booking.assignee ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Service</dt><dd className="text-foreground">{booking.category}</dd></div>
                <div className="gap-4"><dt className="text-muted">Completion notes</dt><dd className="mt-1 text-foreground">{booking.completionNotes ?? "—"}</dd></div>
              </dl>
              {rejecting && (
                <div className="motion-safe:animate-in motion-safe:fade-in">
                  <Field label="Rejection reason" htmlFor="cf-reason" error={reason.trim().length >= 5 ? undefined : "Tell the assignee what needs redoing"}>
                    <Textarea id="cf-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              {rejecting ? (
                <>
                  <Button variant="outline" onClick={() => setRejecting(false)}>Back</Button>
                  <Button onClick={reject} loading={busy} disabled={reason.trim().length < 5}>Send back to assignee</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setRejecting(true)}>Reject</Button>
                  <Button onClick={confirm} loading={busy}>Confirm completion</Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- cancel */

export function CancelBookingDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (booking) setReason(""); }, [booking]);
  const submit = async () => {
    if (!booking || reason.trim().length < 3) return;
    setBusy(true);
    try {
      await cancelServiceBooking(booking.id, reason);
      toast.success(`Booking cancelled — ${booking.reference}`);
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t cancel"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel {booking.reference}?</DialogTitle>
              <DialogDescription>The client and any assigned staff will be notified.</DialogDescription>
            </DialogHeader>
            <Field label="Cancellation reason" htmlFor="cn-reason" error={reason.trim().length >= 3 ? undefined : "Required"}>
              <Textarea id="cn-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Keep booking</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={reason.trim().length < 3}>Cancel booking</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Read-only assessment panel shown permanently on the booking detail. */
export function AssessmentPanel({ booking }: { booking: ServiceBooking }) {
  if (!booking.assessedAmount) return null;
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Assessment</p>
      <dl className="space-y-1.5 text-body">
        <div className="flex justify-between gap-4"><dt className="text-muted">Quoted</dt><dd className="font-medium text-foreground">{formatCurrency(booking.assessedAmount)}</dd></div>
        <div className="gap-4"><dt className="text-muted">Scope</dt><dd className="mt-0.5 text-foreground">{booking.assessmentScope}</dd></div>
        {booking.assessmentNotes && <div className="gap-4"><dt className="text-muted">Notes</dt><dd className="mt-0.5 text-foreground">{booking.assessmentNotes}</dd></div>}
        <div className="flex justify-between gap-4"><dt className="text-muted">Assessed by</dt><dd className="text-foreground">{booking.assessedBy ?? "—"}{booking.assessedAt ? ` · ${formatDate(booking.assessedAt)}` : ""}</dd></div>
      </dl>
    </div>
  );
}
