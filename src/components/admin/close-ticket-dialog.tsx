"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatUGX } from "@/lib/format";
import { closeTicketWithLiability } from "@/lib/api/maintenance-liability";
import { tenantName } from "@/lib/api/admin";
import type { MaintenanceTicket, TicketLiability } from "@/lib/mock/types";

const OPTIONS: { value: TicketLiability; label: string; help: string }[] = [
  {
    value: "owner",
    label: "Property Owner",
    help: "Normal wear and tear, or a structural/property issue. This will be recorded as a property expense and deducted from the owner's settlement.",
  },
  {
    value: "tenant",
    label: "Tenant",
    help: "Damage caused by the tenant. An invoice will be generated and sent to the tenant's dashboard for payment.",
  },
  {
    value: "nexora",
    label: "Nexora",
    help: "Nexora will absorb this cost (goodwill, or covered under the management agreement). Neither the owner nor the tenant will be charged.",
  },
];

const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Closes a ticket AND records who pays for it. Extends the existing close action —
 * the resolution summary and cost capture are unchanged, the liability decision is
 * what's new, because a cost with no payer never reaches the financial records.
 */
export function CloseTicketDialog({
  ticket, resolution: initialResolution, onOpenChange, onDone,
}: {
  ticket: MaintenanceTicket | null;
  resolution: string;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [resolution, setResolution] = React.useState("");
  const [labour, setLabour] = React.useState(0);
  const [materials, setMaterials] = React.useState(0);
  const [liability, setLiability] = React.useState<TicketLiability | "">("");
  const [reason, setReason] = React.useState("");
  /* F3 — changing the payer at closure has to be justified. */
  const [changeReason, setChangeReason] = React.useState("");
  const [due, setDue] = React.useState(plusDays(14));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!ticket) return;
    setResolution(initialResolution || ticket.resolution || "");
    const total = ticket.cost ?? 0;
    setLabour(ticket.labourCost ?? Math.round(total * 0.6));
    setMaterials(ticket.materialsCost ?? total - Math.round(total * 0.6));
    // Pre-fill from the routing decision — editable, because the actual cause may
    // differ from what the assessment suggested.
    setLiability(ticket.liability ?? ticket.chargeTo ?? "");
    setReason(ticket.liabilityReason ?? ticket.chargeToReason ?? "");
    setChangeReason("");
    setDue(plusDays(14));
  }, [ticket, initialResolution]);

  const total = (Number(labour) || 0) + (Number(materials) || 0);
  const assessed = ticket?.assessedCost ?? null;
  const variance = assessed != null ? total - assessed : null;
  const changedFromRouting = !!ticket?.chargeTo && !!liability && liability !== ticket.chargeTo;
  /* Over-run on work the owner signed off for a specific figure is the case worth
     flagging — they approved an amount, not a blank cheque. */
  const overApproved =
    ticket?.ownerApprovalStatus === "approved" && assessed != null && variance != null && variance > assessed * 0.1;
  const canSubmit =
    !!liability &&
    reason.trim().length >= 5 &&
    resolution.trim().length >= 5 &&
    (!changedFromRouting || changeReason.trim().length >= 5);

  const submit = async () => {
    if (!ticket || !canSubmit) return;
    setBusy(true);
    try {
      await closeTicketWithLiability(ticket.id, {
        resolution: resolution.trim(),
        labourCost: Number(labour) || 0,
        materialsCost: Number(materials) || 0,
        liability: liability as TicketLiability,
        liabilityReason: reason.trim(),
        invoiceDueDate: liability === "tenant" ? due : undefined,
        liabilityChangeReason: changedFromRouting ? changeReason.trim() : undefined,
      });
      if (liability === "owner") {
        toast.success(`Ticket closed — ${formatUGX(total)} recorded as owner expense`);
      } else if (liability === "tenant") {
        // F3 — the tenant is usually invoiced at routing and has usually already
        // paid, which is what released the work. Saying "issued" then is wrong.
        toast.success(
          ticket.paymentStatus === "paid"
            ? `Ticket closed — ${formatUGX(total)} already collected from ${tenantName(ticket.tenantId)} on INV-${ticket.ref}`
            : `Ticket closed — invoice INV-${ticket.ref} issued to ${tenantName(ticket.tenantId)}`,
        );
      } else {
        toast.success(`Ticket closed — ${formatUGX(total)} absorbed by Nexora`);
      }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t close the ticket"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Close {ticket.ref}</DialogTitle>
              <DialogDescription>{ticket.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Field label="Resolution summary" htmlFor="cl-res" error={resolution.trim().length >= 5 ? undefined : "Describe what was done"}>
                <Textarea id="cl-res" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was done to resolve it…" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Labour cost (UGX)" htmlFor="cl-labour">
                  <Input id="cl-labour" type="number" value={labour} onChange={(e) => setLabour(Number(e.target.value))} />
                </Field>
                <Field label="Materials cost (UGX)" htmlFor="cl-materials">
                  <Input id="cl-materials" type="number" value={materials} onChange={(e) => setMaterials(Number(e.target.value))} />
                </Field>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-body font-medium text-foreground">Actual total</span>
                  <span className="font-heading text-h3 font-semibold text-primary">{formatUGX(total)}</span>
                </div>
                {assessed != null && (
                  <p className="mt-1.5 text-caption text-muted">
                    Assessed {formatUGX(assessed)}, actual {formatUGX(total)} — variance{" "}
                    <span className="font-medium text-foreground">
                      {variance! >= 0 ? "+" : "−"}{formatUGX(Math.abs(variance!))}
                    </span>
                  </p>
                )}
              </div>

              {overApproved && (
                <p className="rounded-lg border border-accent/40 bg-surface-active px-3.5 py-2.5 text-caption text-foreground motion-safe:animate-in motion-safe:fade-in">
                  Actual cost exceeds the approved estimate by {formatUGX(variance!)}. Consider whether
                  additional owner approval is needed.
                </p>
              )}

              {/* Liability — the decision that routes the money */}
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-body font-medium text-foreground">Who is responsible for this cost?</p>
                <div className="space-y-2">
                  {OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                        liability === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="liability"
                        value={o.value}
                        checked={liability === o.value}
                        onChange={() => setLiability(o.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-body font-medium text-foreground">{o.label}</span>
                        <span className="mt-0.5 block text-caption text-muted">{o.help}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-4">
                  <Field
                    label="Liability reason"
                    htmlFor="cl-reason"
                    error={reason.trim().length >= 5 ? undefined : "Required"}
                  >
                    <Textarea id="cl-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this party responsible?" />
                    <p className="mt-1 text-caption text-muted">Explain why this party is responsible. This is recorded in the audit trail.</p>
                  </Field>
                </div>

                {changedFromRouting && (
                  <div className="mt-4 motion-safe:animate-in motion-safe:fade-in">
                    <Field
                      label="Why is this different from the routed payer?"
                      htmlFor="cl-change"
                      error={changeReason.trim().length >= 5 ? undefined : "Required"}
                    >
                      <Textarea id="cl-change" rows={2} value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder={`Routed to ${ticket.chargeTo}, closing as ${liability} — explain why`} />
                      <p className="mt-1 text-caption text-muted">
                        The payer was decided after assessment. Changing it now is recorded in the audit trail.
                      </p>
                    </Field>
                  </div>
                )}

                {liability === "tenant" && (
                  <div className="mt-4 motion-safe:animate-in motion-safe:fade-in">
                    <Field label="Invoice due date" htmlFor="cl-due">
                      <Input id="cl-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                      <p className="mt-1 text-caption text-muted">
                        {ticket.paymentStatus === "paid" ? (
                          <>
                            {tenantName(ticket.tenantId)} has already paid{" "}
                            <span className="font-medium text-foreground">INV-{ticket.ref}</span>. Closing
                            reconciles that invoice — they will not be charged again.
                          </>
                        ) : (
                          <>
                            Invoice <span className="font-medium text-foreground">INV-{ticket.ref}</span> will be issued to {tenantName(ticket.tenantId)}.
                          </>
                        )}
                      </p>
                    </Field>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!canSubmit}>Close ticket</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
