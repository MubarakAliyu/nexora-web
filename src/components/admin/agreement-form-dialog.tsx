"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExclamationCircle } from "flowbite-react-icons/outline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { ownerOptions } from "@/lib/api/admin";
import {
  createAgreement, updateAgreement, getAgreementForOwner, agreementRateLabel, CONTRACT_TYPE_LABEL,
  type ManagementAgreement, type AgreementInput,
} from "@/lib/api/agreements";

const schema = z
  .object({
    ownerId: z.string().min(1, "Select an owner"),
    contractType: z.enum(["fixed_fee", "revenue_sharing", "hybrid"]),
    fixedAmount: z.number().min(0),
    fixedFrequency: z.enum(["monthly", "quarterly", "annual"]),
    commissionPercentage: z.number().min(0).max(100),
    hybridFixedAmount: z.number().min(0),
    hybridPercentage: z.number().min(0).max(100),
    effectiveDate: z.string().min(1, "Effective date required"),
    expiryDate: z.string().min(1, "Expiry date required"),
    settlementSchedule: z.enum(["monthly", "quarterly", "on_demand"]),
    payoutBankName: z.string().optional(),
    payoutAccountName: z.string().optional(),
    payoutAccountNumber: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.effectiveDate && v.expiryDate && new Date(v.expiryDate) <= new Date(v.effectiveDate))
      ctx.addIssue({ path: ["expiryDate"], code: "custom", message: "Expiry must be after the effective date" });
    if (v.contractType === "revenue_sharing" && !(v.commissionPercentage >= 1))
      ctx.addIssue({ path: ["commissionPercentage"], code: "custom", message: "Enter a commission of 1–100%" });
    if (v.contractType === "fixed_fee" && !(v.fixedAmount > 0))
      ctx.addIssue({ path: ["fixedAmount"], code: "custom", message: "Enter an amount greater than 0" });
    if (v.contractType === "hybrid") {
      if (!(v.hybridFixedAmount > 0)) ctx.addIssue({ path: ["hybridFixedAmount"], code: "custom", message: "Enter a base fee > 0" });
      if (!(v.hybridPercentage >= 1)) ctx.addIssue({ path: ["hybridPercentage"], code: "custom", message: "Enter a commission of 1–100%" });
    }
  });

type Values = z.infer<typeof schema>;

const baseDefaults: Values = {
  ownerId: "", contractType: "revenue_sharing",
  fixedAmount: 0, fixedFrequency: "annual", commissionPercentage: 15,
  hybridFixedAmount: 0, hybridPercentage: 10,
  effectiveDate: "", expiryDate: "", settlementSchedule: "monthly",
  payoutBankName: "", payoutAccountName: "", payoutAccountNumber: "", notes: "",
};

export function AgreementFormDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ManagementAgreement | null;
  onDone: () => void;
}) {
  const isEdit = !!editing;
  const owners = React.useMemo(() => ownerOptions(), []);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: baseDefaults,
  });
  const contractType = watch("contractType");
  const ownerId = watch("ownerId");

  React.useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            ownerId: editing.ownerId, contractType: editing.contractType,
            fixedAmount: editing.fixedAmount ?? 0, fixedFrequency: editing.fixedFrequency ?? "annual",
            commissionPercentage: editing.commissionPercentage ?? 15,
            hybridFixedAmount: editing.hybridFixedAmount ?? 0, hybridPercentage: editing.hybridPercentage ?? 10,
            effectiveDate: editing.effectiveDate.slice(0, 10), expiryDate: editing.expiryDate.slice(0, 10),
            settlementSchedule: editing.settlementSchedule,
            payoutBankName: editing.payoutBankName ?? "", payoutAccountName: editing.payoutAccountName ?? "",
            payoutAccountNumber: editing.payoutAccountNumber ?? "", notes: editing.notes ?? "",
          }
        : baseDefaults,
    );
  }, [open, editing, reset]);

  // Warn (don't block) if the selected owner already has a different active agreement.
  const existingActive = ownerId ? getAgreementForOwner(ownerId) : undefined;
  const showWarning = existingActive && existingActive.id !== editing?.id;

  const onSubmit = async (v: Values) => {
    const input: AgreementInput = {
      ownerId: v.ownerId,
      contractType: v.contractType,
      effectiveDate: v.effectiveDate,
      expiryDate: v.expiryDate,
      settlementSchedule: v.settlementSchedule,
      payoutBankName: v.payoutBankName || undefined,
      payoutAccountName: v.payoutAccountName || undefined,
      payoutAccountNumber: v.payoutAccountNumber || undefined,
      notes: v.notes || undefined,
      ...(v.contractType === "fixed_fee" ? { fixedAmount: v.fixedAmount, fixedFrequency: v.fixedFrequency } : {}),
      ...(v.contractType === "revenue_sharing" ? { commissionPercentage: v.commissionPercentage } : {}),
      ...(v.contractType === "hybrid" ? { hybridFixedAmount: v.hybridFixedAmount, fixedFrequency: v.fixedFrequency, hybridPercentage: v.hybridPercentage } : {}),
    };
    try {
      const ownerLabel = owners.find((o) => o.id === v.ownerId)?.name ?? "owner";
      if (isEdit && editing) {
        await updateAgreement(editing.id, input);
        toast.success("Agreement updated", { description: `${ownerLabel} — ${CONTRACT_TYPE_LABEL[v.contractType]}.` });
      } else {
        await createAgreement(input);
        toast.success(`Management agreement created for ${ownerLabel} — ${CONTRACT_TYPE_LABEL[v.contractType]}`);
      }
      onOpenChange(false);
      onDone();
    } catch {
      toast.error(isEdit ? "Couldn’t update agreement" : "Couldn’t create agreement", { description: "Please try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit agreement" : "Create agreement"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the management agreement terms." : "Define how Nexora earns from managing this owner’s properties."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Section 1 — owner */}
          <section className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Owner</p>
            <Field label="Property owner" htmlFor="ag-owner" error={errors.ownerId?.message}>
              <select id="ag-owner" className={selectClass} disabled={isEdit} {...register("ownerId")} aria-invalid={!!errors.ownerId}>
                <option value="">Select an owner…</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            {showWarning && existingActive && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-caption text-foreground motion-safe:animate-in motion-safe:fade-in">
                <ExclamationCircle size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>This owner already has an active agreement ({CONTRACT_TYPE_LABEL[existingActive.contractType]}, {agreementRateLabel(existingActive)}). Creating a new one will require terminating the existing agreement first.</span>
              </div>
            )}
          </section>

          {/* Section 2 — contract terms */}
          <section className="space-y-3 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Contract terms</p>
            <Field label="Contract type" htmlFor="ag-type">
              <select id="ag-type" className={selectClass} {...register("contractType")}>
                <option value="fixed_fee">Fixed Fee</option>
                <option value="revenue_sharing">Revenue Sharing</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>

            {contractType === "fixed_fee" && (
              <div className="grid gap-3 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
                <Field label="Fixed amount (UGX)" htmlFor="ag-fixed" error={errors.fixedAmount?.message}>
                  <Input id="ag-fixed" type="number" {...register("fixedAmount", { valueAsNumber: true })} aria-invalid={!!errors.fixedAmount} />
                </Field>
                <Field label="Frequency" htmlFor="ag-freq">
                  <select id="ag-freq" className={selectClass} {...register("fixedFrequency")}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
                  </select>
                </Field>
              </div>
            )}

            {contractType === "revenue_sharing" && (
              <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
                <Field label="Commission percentage (%)" htmlFor="ag-pct" error={errors.commissionPercentage?.message}>
                  <Input id="ag-pct" type="number" {...register("commissionPercentage", { valueAsNumber: true })} aria-invalid={!!errors.commissionPercentage} />
                </Field>
              </div>
            )}

            {contractType === "hybrid" && (
              <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Base fee (UGX)" htmlFor="ag-hfixed" error={errors.hybridFixedAmount?.message}>
                    <Input id="ag-hfixed" type="number" {...register("hybridFixedAmount", { valueAsNumber: true })} aria-invalid={!!errors.hybridFixedAmount} />
                  </Field>
                  <Field label="Frequency" htmlFor="ag-hfreq">
                    <select id="ag-hfreq" className={selectClass} {...register("fixedFrequency")}>
                      <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
                    </select>
                  </Field>
                </div>
                <Field label="Commission percentage (%)" htmlFor="ag-hpct" error={errors.hybridPercentage?.message}>
                  <Input id="ag-hpct" type="number" {...register("hybridPercentage", { valueAsNumber: true })} aria-invalid={!!errors.hybridPercentage} />
                </Field>
                <p className="text-caption text-muted">Hybrid agreements combine a base fee with a commission on revenue above the fee threshold.</p>
              </div>
            )}
          </section>

          {/* Section 3 — duration & schedule */}
          <section className="space-y-3 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Duration &amp; schedule</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Effective date" htmlFor="ag-eff" error={errors.effectiveDate?.message}>
                <Input id="ag-eff" type="date" {...register("effectiveDate")} aria-invalid={!!errors.effectiveDate} />
              </Field>
              <Field label="Expiry date" htmlFor="ag-exp" error={errors.expiryDate?.message}>
                <Input id="ag-exp" type="date" {...register("expiryDate")} aria-invalid={!!errors.expiryDate} />
              </Field>
            </div>
            <Field label="Settlement schedule" htmlFor="ag-sched">
              <select id="ag-sched" className={selectClass} {...register("settlementSchedule")}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="on_demand">On Demand</option>
              </select>
            </Field>
          </section>

          {/* Section 4 — payout */}
          <section className="space-y-3 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Payout details <span className="font-normal normal-case text-muted">(optional)</span></p>
            <Field label="Bank name" htmlFor="ag-bank"><Input id="ag-bank" {...register("payoutBankName")} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account name" htmlFor="ag-accname"><Input id="ag-accname" {...register("payoutAccountName")} /></Field>
              <Field label="Account number" htmlFor="ag-accno"><Input id="ag-accno" {...register("payoutAccountNumber")} /></Field>
            </div>
            <p className="text-caption text-muted">Bank details can also be updated from the owner’s profile.</p>
          </section>

          {/* Section 5 — notes */}
          <section className="space-y-2 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Notes <span className="font-normal normal-case text-muted">(optional)</span></p>
            <Field label="Notes" htmlFor="ag-notes"><Textarea id="ag-notes" rows={3} {...register("notes")} /></Field>
          </section>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Create agreement"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
