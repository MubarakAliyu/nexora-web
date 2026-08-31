"use client";

/**
 * Worker-raised additional charge (F4.3).
 *
 * The worker is the person who actually DISCOVERS extra work — they are standing
 * in the room. F2 built this flow for admins; this is the same flow from the
 * other end. It calls `raiseAdditionalCharge` directly rather than reimplementing
 * anything, so the charge lands as "sent to customer" and travels the identical
 * approval → invoice → payment path. The worker proposes; the customer decides.
 */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatCurrency } from "@/lib/format";
import { raiseAdditionalCharge } from "@/lib/api/additional-charges";

export function RaiseChargeSheet({
  open, onOpenChange, bookingId, raisedBy, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bookingId: string | null;
  raisedBy: string;
  onDone: () => void;
}) {
  const [description, setDescription] = React.useState("");
  const [justification, setJustification] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) { setDescription(""); setJustification(""); setAmount(""); }
  }, [open]);

  const parsed = Number(amount);
  const valid =
    description.trim().length >= 5 &&
    justification.trim().length >= 5 &&
    Number.isFinite(parsed) && parsed > 0;

  const submit = async () => {
    if (!bookingId || !valid) return;
    setBusy(true);
    try {
      const charge = await raiseAdditionalCharge({
        bookingId,
        description: description.trim(),
        justification: justification.trim(),
        items: null,
        customAmount: Math.round(parsed),
        customDescription: description.trim(),
        raisedBy,
      });
      toast.success("Sent to the customer for approval", {
        description: `${charge.reference} — ${formatCurrency(charge.amount)}. Don't start the extra work until they approve.`,
      });
      onOpenChange(false);
      onDone();
    } catch {
      toast.error("Couldn't raise the charge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extra work needed?</DialogTitle>
          <DialogDescription>
            This goes to the customer to approve and pay before you start it.
          </DialogDescription>
        </DialogHeader>

        <Field label="What extra work?" htmlFor="wc-desc" error={description.trim().length >= 5 ? undefined : "Required"}>
          <Textarea id="wc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Replace cracked waste pipe under the sink" />
        </Field>

        <Field label="Why is it needed?" htmlFor="wc-just" error={justification.trim().length >= 5 ? undefined : "Required"}>
          <Textarea id="wc-just" rows={2} value={justification} onChange={(e) => setJustification(e.target.value)}
            placeholder="What you found, and what happens if it isn't done" />
        </Field>

        <Field label="Amount (UGX)" htmlFor="wc-amt" error={Number.isFinite(parsed) && parsed > 0 ? undefined : "Required"}>
          <Input id="wc-amt" type="number" min={0} step={1000} value={amount}
            onChange={(e) => setAmount(e.target.value)} />
          <p className="mt-1 text-caption text-muted">
            Worker rates pending stakeholder confirmation.
          </p>
        </Field>

        <p className="rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
          The original job and the price the customer already agreed are not changed by this.
        </p>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button loading={busy} disabled={!valid} onClick={submit}>Send to customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
