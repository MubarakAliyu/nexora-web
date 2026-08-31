"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExclamationCircle, Image as ImageIcon } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useSession } from "@/lib/stores/session";
import { maintenanceStaff, propertyName, unitLabel } from "@/lib/api/admin";
import {
  recordAssessment, routeCharge, suggestedRoute, getOwnerApprovalThreshold,
} from "@/lib/api/maintenance-routing";
import type { MaintenanceTicket, ChargeTo } from "@/lib/mock/types";
import { CurrencyCode } from "@/components/app/currency-code";

/* ------------------------------------------------------------- assessment */

const assessSchema = z.object({
  assessedBy: z.string().min(1, "Choose who assessed it"),
  assessedAt: z.string().min(1, "Pick a date"),
  labour: z.number().min(0),
  materials: z.number().min(0),
  notes: z.string().min(10, "Describe what was found (10+ characters)"),
});
type AssessValues = z.infer<typeof assessSchema>;

/**
 * Pre-work assessment. This is the estimate the payer decision is made on — E4's
 * cost fields still record what the job actually cost at closure, and the gap
 * between the two is tracked as variance.
 */
export function AssessmentDialog({ ticket, onOpenChange, onDone }: {
  ticket: MaintenanceTicket | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const staff = React.useMemo(() => maintenanceStaff(), []);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<AssessValues>({
      resolver: zodResolver(assessSchema),
      defaultValues: { assessedBy: "", assessedAt: "", labour: 0, materials: 0, notes: "" },
    });

  React.useEffect(() => {
    if (!ticket) return;
    reset({
      // Pre-filled from whoever is already assigned, but editable — the person who
      // attends is not always the person the job was booked to.
      assessedBy: ticket.assignee ?? staff[0]?.name ?? "",
      assessedAt: new Date().toISOString().slice(0, 10),
      labour: 0,
      materials: 0,
      notes: "",
    });
  }, [ticket, reset, staff]);

  const total = (Number(watch("labour")) || 0) + (Number(watch("materials")) || 0);

  const submit = async (v: AssessValues) => {
    if (!ticket) return;
    try {
      await recordAssessment(ticket.id, {
        assessedBy: v.assessedBy,
        assessedAt: v.assessedAt,
        labour: v.labour,
        materials: v.materials,
        notes: v.notes,
      });
      toast.success(`Assessment recorded — ${formatCurrency(total)} estimated`, { description: ticket.ref });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t record the assessment"); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Record assessment</DialogTitle>
              <DialogDescription>{ticket.ref} · {ticket.title}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Assessed by" htmlFor="as-by" error={errors.assessedBy?.message}>
                  <select id="as-by" className={selectClass} {...register("assessedBy")}>
                    {staff.map((s) => <option key={s.id} value={s.name}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Assessment date" htmlFor="as-date" error={errors.assessedAt?.message}>
                  <Input id="as-date" type="date" {...register("assessedAt")} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={<>Estimated labour (<CurrencyCode />)</>} htmlFor="as-labour" error={errors.labour?.message}>
                  <Input id="as-labour" type="number" min={0} step={1000} {...register("labour", { valueAsNumber: true })} />
                </Field>
                <Field label={<>Estimated materials (<CurrencyCode />)</>} htmlFor="as-mat" error={errors.materials?.message}>
                  <Input id="as-mat" type="number" min={0} step={1000} {...register("materials", { valueAsNumber: true })} />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
                <span className="text-body font-medium text-foreground">Estimated total</span>
                <span className="font-heading text-h2 font-semibold text-primary">{formatCurrency(total)}</span>
              </div>

              <Field label="Assessment notes" htmlFor="as-notes" error={errors.notes?.message}>
                <Textarea id="as-notes" rows={3} {...register("notes")}
                  placeholder="What is wrong, and what is needed to put it right" />
              </Field>

              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <ImageIcon size={20} className="mx-auto text-muted" />
                <p className="mt-1.5 text-caption text-muted">Photo upload — available once file storage is wired in.</p>
              </div>

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

/* ---------------------------------------------------------------- routing */

const ROUTE_OPTIONS: { value: ChargeTo; label: string; help: string }[] = [
  {
    value: "tenant",
    label: "Tenant",
    help: "Damage caused by the tenant. An invoice will be generated and the tenant must pay before work proceeds.",
  },
  {
    value: "owner",
    label: "Property Owner",
    help: "Normal wear and tear, or a structural issue. Recorded as a property expense and deducted from the owner's settlement.",
  },
  {
    value: "nexora",
    label: "Nexora",
    help: "Nexora will absorb this cost. Neither party will be charged.",
  },
];

const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The "who pays?" decision, made after assessment and before any work.
 *
 * The system SUGGESTS a route but never selects one — a suggestion that pre-ticks
 * itself is a decision made by the software, and this decision has to be a person's.
 * Routing against the suggestion is allowed but recorded as an override, with a
 * reason, and only for roles senior enough to make that call.
 */
export function RouteChargeDialog({ ticket, onOpenChange, onDone }: {
  ticket: MaintenanceTicket | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const user = useSession((s) => s.user);
  const canOverride = user?.role === "super_admin" || user?.role === "property_manager";

  const [route, setRoute] = React.useState<ChargeTo | "">("");
  const [reason, setReason] = React.useState("");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [due, setDue] = React.useState(plusDays(14));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!ticket) return;
    setRoute(""); setReason(""); setOverrideReason(""); setDue(plusDays(14));
  }, [ticket]);

  const threshold = getOwnerApprovalThreshold();
  const suggestion = ticket ? suggestedRoute(ticket) : { route: null as ChargeTo | null, why: "" };
  const cost = ticket?.assessedCost ?? 0;
  const isOverride = !!suggestion.route && !!route && route !== suggestion.route;
  const needsApproval = route === "owner" && cost >= threshold;

  const canSubmit =
    !!route &&
    reason.trim().length >= 5 &&
    (!isOverride || (canOverride && overrideReason.trim().length >= 5));

  const submit = async () => {
    if (!ticket || !canSubmit) return;
    setBusy(true);
    try {
      await routeCharge(ticket.id, {
        chargeTo: route as ChargeTo,
        reason: reason.trim(),
        decidedBy: user?.name ?? "Admin",
        overrideReason: isOverride ? overrideReason.trim() : undefined,
        invoiceDueDate: route === "tenant" ? due : undefined,
      });
      if (route === "tenant") {
        toast.success("Charge routed to tenant", { description: `Invoice INV-${ticket.ref} issued — work waits for payment.` });
      } else if (route === "owner") {
        toast.success(needsApproval ? "Sent to owner for approval" : "Charge routed to owner", {
          description: needsApproval ? `${formatCurrency(cost)} exceeds the approval threshold.` : "Below the threshold — scheduled directly.",
        });
      } else {
        toast.success("Cost absorbed by Nexora", { description: "Work scheduled at no cost to either party." });
      }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t route the charge"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Route charge — who pays?</DialogTitle>
              <DialogDescription>
                {ticket.ref} · {propertyName(ticket.propertyId)} · {unitLabel(ticket.unitId)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-caption uppercase tracking-wide text-muted">Assessed cost</p>
                <p className="mt-1 font-heading text-h1 font-semibold text-primary">{formatCurrency(cost)}</p>
                <p className="mt-1 text-caption text-muted">
                  Labour {formatCurrency(ticket.assessedLabour ?? 0)} · Materials {formatCurrency(ticket.assessedMaterials ?? 0)}
                </p>
                {ticket.assessmentNotes && (
                  <p className="mt-2 text-caption text-muted">{ticket.assessmentNotes}</p>
                )}
              </div>

              {/* A hint, deliberately not a pre-selection. */}
              <p className="flex items-start gap-2 rounded-lg border border-border bg-surface-hover px-3.5 py-2.5 text-caption text-muted">
                <ExclamationCircle size={15} className="mt-0.5 shrink-0 text-primary" />
                {suggestion.why}
              </p>

              <div className="space-y-2">
                {ROUTE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                      route === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <input type="radio" name="chargeTo" value={o.value} checked={route === o.value}
                      onChange={() => setRoute(o.value)} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-body font-medium text-foreground">{o.label}</span>
                      <span className="mt-0.5 block text-caption text-muted">{o.help}</span>
                    </span>
                  </label>
                ))}
              </div>

              {needsApproval && (
                <p className="rounded-lg border border-accent/40 bg-surface-active px-3.5 py-2.5 text-caption text-foreground motion-safe:animate-in motion-safe:fade-in">
                  This exceeds the owner approval threshold of {formatCurrency(threshold)}. The owner will be
                  asked to approve before work proceeds.
                </p>
              )}

              <Field label="Reason" htmlFor="rc-reason" error={reason.trim().length >= 5 ? undefined : "Required"}>
                <Textarea id="rc-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this party is responsible for the cost" />
                <p className="mt-1 text-caption text-muted">Recorded in the audit trail.</p>
              </Field>

              {isOverride && (
                <div className="rounded-lg border border-accent/40 p-3 motion-safe:animate-in motion-safe:fade-in">
                  <p className="text-body font-medium text-foreground">Overriding the suggested route</p>
                  <p className="mt-0.5 text-caption text-muted">{suggestion.why}</p>
                  <div className="mt-3">
                    <Field label="Override reason" htmlFor="rc-override"
                      error={!canOverride ? "Your role cannot override the suggested route" : overrideReason.trim().length >= 5 ? undefined : "Required"}>
                      <Textarea id="rc-override" rows={2} value={overrideReason} disabled={!canOverride}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Why the suggested route does not apply here"
                        title={canOverride ? undefined : "Only a Property Manager or Super Admin may override the suggested route"} />
                    </Field>
                  </div>
                </div>
              )}

              {route === "tenant" && (
                <Field label="Invoice due date" htmlFor="rc-due">
                  <Input id="rc-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                  <p className="mt-1 text-caption text-muted">
                    Invoice <span className="font-medium text-foreground">INV-{ticket.ref}</span> will be issued.
                  </p>
                </Field>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!canSubmit}>Route charge</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
