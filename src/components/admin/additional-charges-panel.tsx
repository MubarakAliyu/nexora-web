"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  chargesForBooking, acceptAdditionalCharge, declineAdditionalCharge,
  payAdditionalCharge, CHARGE_STATUS_LABEL,
} from "@/lib/api/additional-charges";
import type { AdditionalCharge, AdditionalChargeStatus } from "@/lib/mock/types";

const fmt = (n: number, c = "UGX") => `${c} ${Math.round(n).toLocaleString("en-UG")}`;

const STATUS_STYLE: Record<AdditionalChargeStatus, string> = {
  proposed: "border-transparent bg-surface-hover text-muted",
  sent_to_customer: "border-primary/30 bg-primary/10 text-primary",
  accepted: "border-primary/30 bg-primary/10 text-primary",
  awaiting_payment: "border-accent/40 bg-surface-active text-foreground",
  paid: "border-transparent bg-surface-active text-foreground",
  declined: "border-transparent bg-surface-hover text-muted",
  cancelled: "border-transparent bg-surface-hover text-muted",
};

/* ------------------------------------------------------------ decline dialog */

function DeclineDialog({ charge, onOpenChange, onDone }: {
  charge: AdditionalCharge | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (charge) setReason(""); }, [charge]);

  const submit = async () => {
    if (!charge || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await declineAdditionalCharge(charge.id, reason.trim());
      toast.success("Additional charge declined", { description: "The original scope continues unchanged." });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t decline the charge"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!charge} onOpenChange={onOpenChange}>
      <DialogContent>
        {charge && (
          <>
            <DialogHeader>
              <DialogTitle>Decline additional charge</DialogTitle>
              <DialogDescription>{charge.reference} · {fmt(charge.amount, charge.currency)}</DialogDescription>
            </DialogHeader>
            <Field label="Reason for declining" htmlFor="dc-reason"
              error={reason.trim().length >= 5 ? undefined : "Required"}>
              <Textarea id="dc-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Why the customer declined this extra work" />
              <p className="mt-1 text-caption text-muted">
                The admin and the assigned worker are notified. The original booking continues at its original scope.
              </p>
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={reason.trim().length < 5}>Decline charge</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ payment dialog */

function ChargePaymentDialog({ charge, onOpenChange, onDone }: {
  charge: AdditionalCharge | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [method, setMethod] = React.useState("mobile_money");
  const [reference, setReference] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (charge) { setMethod("mobile_money"); setReference(""); } }, [charge]);

  const submit = async () => {
    if (!charge) return;
    setBusy(true);
    try {
      const ref = reference.trim() || `ACP-${Date.now().toString().slice(-8)}`;
      await payAdditionalCharge(charge.id, { method, reference: ref, amount: charge.amount });
      toast.success("Additional charge paid", { description: `${charge.reference} · ${ref}` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t record the payment"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!charge} onOpenChange={onOpenChange}>
      <DialogContent>
        {charge && (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>{charge.reference}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
                <span className="text-body font-medium text-foreground">Amount due</span>
                <span className="font-heading text-h3 font-semibold text-primary">{fmt(charge.amount, charge.currency)}</span>
              </div>
              <Field label="Payment method" htmlFor="cp-method">
                <select id="cp-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </Field>
              <Field label="Payment reference" htmlFor="cp-ref">
                <Input id="cp-ref" value={reference} onChange={(e) => setReference(e.target.value)}
                  placeholder="Leave blank to generate one" />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy}>Record payment</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- panel */

export function AdditionalChargesPanel({ bookingId, onChanged }: {
  bookingId: string; onChanged: () => void;
}) {
  const [declining, setDeclining] = React.useState<AdditionalCharge | null>(null);
  const [paying, setPaying] = React.useState<AdditionalCharge | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const charges = chargesForBooking(bookingId);
  if (charges.length === 0) return null;

  const accept = async (c: AdditionalCharge) => {
    setBusyId(c.id);
    try {
      const updated = await acceptAdditionalCharge(c.id);
      toast.success("Additional charge accepted", { description: `Invoice INV-${updated.reference} issued.` });
      onChanged();
    } catch { toast.error("Couldn’t accept the charge"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-caption font-medium uppercase tracking-wide text-muted">
        Additional charges ({charges.length})
      </p>
      <div className="space-y-3">
        {charges.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-body font-medium text-foreground">{c.reference}</p>
                <p className="mt-0.5 text-caption text-muted">{c.description}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-body font-semibold text-primary">{fmt(c.amount, c.currency)}</p>
                <Badge className={cn("mt-1", STATUS_STYLE[c.status])}>{CHARGE_STATUS_LABEL[c.status]}</Badge>
              </div>
            </div>

            <p className="mt-2 text-caption text-muted"><span className="text-foreground">Why:</span> {c.justification}</p>

            {c.items && c.items.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {c.items.map((l) => (
                  <li key={l.itemId} className="flex justify-between text-caption">
                    <span className="text-muted">{l.name} × {l.quantity}</span>
                    <span className="text-foreground">{fmt(l.lineTotal, c.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            {c.customAmount ? (
              <div className="mt-1 flex justify-between text-caption">
                <span className="text-muted">{c.customDescription ?? "Custom amount"}</span>
                <span className="text-foreground">{fmt(c.customAmount, c.currency)}</span>
              </div>
            ) : null}

            <p className="mt-2 text-caption text-muted">
              Raised by {c.raisedBy} · {formatDate(c.raisedAt)}
              {c.customerRespondedAt ? ` · customer responded ${formatDate(c.customerRespondedAt)}` : ""}
              {c.paidAt ? ` · paid ${formatDate(c.paidAt)}` : ""}
            </p>
            {c.declineReason && (
              <p className="mt-1 text-caption text-muted">
                <span className="text-foreground">Declined:</span> {c.declineReason} — original scope continues unchanged.
              </p>
            )}

            {/* Customer-response actions. Non-tenant customers have no portal yet, so
                the admin records the response after contacting them. */}
            {c.status === "sent_to_customer" && (
              <div className="mt-3">
                <p className="mb-2 text-caption text-muted">
                  Customer was notified. Record their response:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busyId === c.id} onClick={() => accept(c)}>Customer accepted</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeclining(c)}>Customer declined</Button>
                </div>
              </div>
            )}
            {c.status === "awaiting_payment" && (
              <div className="mt-3">
                <Button size="sm" onClick={() => setPaying(c)}>Record payment</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <DeclineDialog charge={declining} onOpenChange={(o) => !o && setDeclining(null)} onDone={onChanged} />
      <ChargePaymentDialog charge={paying} onOpenChange={(o) => !o && setPaying(null)} onDone={onChanged} />
    </div>
  );
}
