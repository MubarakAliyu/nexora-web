"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCircle, Users, ArrowsRepeat, LockOpen } from "flowbite-react-icons/outline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { convertLeadToOwner, convertLeadToTenant, genTempPassword, type Lead } from "@/lib/api/admin";
import type { AgreementInput } from "@/lib/api/agreements";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(6, "Phone required"),
  // owner
  company: z.string().optional(),
  nationality: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  createAgreement: z.boolean(),
  contractType: z.enum(["fixed_fee", "revenue_sharing"]),
  commissionPercentage: z.number().min(0).max(100),
  fixedAmount: z.number().min(0),
  fixedFrequency: z.enum(["monthly", "quarterly", "annual"]),
  effectiveDate: z.string(),
  settlementSchedule: z.enum(["monthly", "quarterly", "on_demand"]),
  // tenant
  nin: z.string().optional(),
  employer: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function ConvertLeadDialog({
  lead, target, onOpenChange, onDone,
}: {
  lead: Lead | null;
  target: "owner" | "tenant";
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [tempPassword, setTempPassword] = React.useState(genTempPassword());
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", phone: "", createAgreement: true,
      contractType: "revenue_sharing", commissionPercentage: 15, fixedAmount: 5_000_000, fixedFrequency: "annual",
      effectiveDate: today, settlementSchedule: "monthly",
    },
  });
  const createAg = watch("createAgreement");
  const contractType = watch("contractType");
  const isOwner = target === "owner";

  React.useEffect(() => {
    if (lead) {
      setTempPassword(genTempPassword());
      reset({
        name: lead.name, email: lead.email, phone: lead.phone === "—" ? "" : lead.phone,
        company: "", nationality: "", bankName: "", accountName: "", accountNumber: "",
        createAgreement: true, contractType: "revenue_sharing", commissionPercentage: 15,
        fixedAmount: 5_000_000, fixedFrequency: "annual", effectiveDate: today, settlementSchedule: "monthly",
        nin: "", employer: "", emergencyName: "", emergencyPhone: "",
      });
    }
  }, [lead, reset, today]);

  const onSubmit = async (v: Values) => {
    if (!lead) return;
    try {
      if (isOwner) {
        let agreement: AgreementInput | null = null;
        if (v.createAgreement) {
          agreement = {
            ownerId: "", contractType: v.contractType,
            effectiveDate: v.effectiveDate, expiryDate: new Date(new Date(v.effectiveDate).setFullYear(new Date(v.effectiveDate).getFullYear() + 1)).toISOString().slice(0, 10),
            settlementSchedule: v.settlementSchedule,
            ...(v.contractType === "revenue_sharing" ? { commissionPercentage: v.commissionPercentage } : { fixedAmount: v.fixedAmount, fixedFrequency: v.fixedFrequency }),
          };
        }
        await convertLeadToOwner(lead.id, {
          name: v.name, email: v.email, phone: v.phone, company: v.company || undefined, nationality: v.nationality || undefined,
          bankName: v.bankName || undefined, accountName: v.accountName || undefined, accountNumber: v.accountNumber || undefined,
          tempPassword, agreement,
        });
      } else {
        await convertLeadToTenant(lead.id, {
          name: v.name, email: v.email, phone: v.phone, nin: v.nin || undefined, employer: v.employer || undefined,
          emergencyContact: v.emergencyName ? `${v.emergencyName}${v.emergencyPhone ? ` · ${v.emergencyPhone}` : ""}` : undefined,
          tempPassword,
        });
      }
      toast.success(`${isOwner ? "Owner" : "Tenant"} account created — activation email sent to ${v.email}`);
      onOpenChange(false);
      onDone();
    } catch {
      toast.error("Couldn’t convert lead", { description: "Please try again." });
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOwner ? <UserCircle size={20} className="text-primary" /> : <Users size={20} className="text-primary" />}
            Convert to {isOwner ? "Owner" : "Tenant"}
          </DialogTitle>
          <DialogDescription>Create a {isOwner ? "property owner" : "resident"} account from this lead and send an activation email.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Personal */}
          <section className="space-y-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Personal details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" htmlFor="cv-name" error={errors.name?.message}><Input id="cv-name" {...register("name")} /></Field>
              <Field label="Email (login)" htmlFor="cv-email" error={errors.email?.message}><Input id="cv-email" type="email" {...register("email")} /></Field>
              <Field label="Phone" htmlFor="cv-phone" error={errors.phone?.message}><Input id="cv-phone" {...register("phone")} /></Field>
              {isOwner && <Field label="Company (optional)" htmlFor="cv-company"><Input id="cv-company" {...register("company")} /></Field>}
              {isOwner && <Field label="Nationality (optional)" htmlFor="cv-nat"><Input id="cv-nat" {...register("nationality")} /></Field>}
            </div>
          </section>

          {/* Owner: bank */}
          {isOwner && (
            <section className="space-y-3 border-t border-border pt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">Bank details <span className="font-normal normal-case">(optional)</span></p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bank name" htmlFor="cv-bank"><Input id="cv-bank" {...register("bankName")} /></Field>
                <Field label="Account name" htmlFor="cv-accn"><Input id="cv-accn" {...register("accountName")} /></Field>
                <Field label="Account number" htmlFor="cv-accno"><Input id="cv-accno" {...register("accountNumber")} /></Field>
              </div>
              <p className="text-caption text-muted">Bank details are optional during onboarding. They can be added later before the first settlement.</p>
            </section>
          )}

          {/* Owner: agreement */}
          {isOwner && (
            <section className="space-y-3 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-body font-medium text-foreground">
                <input type="checkbox" {...register("createAgreement")} className="h-4 w-4 rounded border-border text-primary focus-visible:ring-primary" />
                Create Management Agreement
              </label>
              {createAg ? (
                <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Contract type" htmlFor="cv-ct">
                      <select id="cv-ct" className={selectClass} {...register("contractType")}>
                        <option value="revenue_sharing">Revenue Sharing</option>
                        <option value="fixed_fee">Fixed Fee</option>
                      </select>
                    </Field>
                    {contractType === "revenue_sharing" ? (
                      <Field label="Commission (%)" htmlFor="cv-pct"><Input id="cv-pct" type="number" {...register("commissionPercentage", { valueAsNumber: true })} /></Field>
                    ) : (
                      <Field label="Fixed amount (UGX)" htmlFor="cv-fx"><Input id="cv-fx" type="number" {...register("fixedAmount", { valueAsNumber: true })} /></Field>
                    )}
                    <Field label="Effective date" htmlFor="cv-eff"><Input id="cv-eff" type="date" {...register("effectiveDate")} /></Field>
                    <Field label="Settlement schedule" htmlFor="cv-sched">
                      <select id="cv-sched" className={selectClass} {...register("settlementSchedule")}>
                        <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="on_demand">On Demand</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ) : (
                <p className="text-caption text-muted">Agreement can be created separately from the Agreements module.</p>
              )}
            </section>
          )}

          {/* Tenant: identification + employment + emergency */}
          {!isOwner && (
            <section className="space-y-3 border-t border-border pt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">Identification &amp; contact <span className="font-normal normal-case">(optional)</span></p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="NIN / Passport" htmlFor="cv-nin"><Input id="cv-nin" {...register("nin")} /></Field>
                <Field label="Employer" htmlFor="cv-emp"><Input id="cv-emp" {...register("employer")} /></Field>
                <Field label="Emergency contact name" htmlFor="cv-en"><Input id="cv-en" {...register("emergencyName")} /></Field>
                <Field label="Emergency contact phone" htmlFor="cv-ep"><Input id="cv-ep" {...register("emergencyPhone")} /></Field>
              </div>
            </section>
          )}

          {/* Account creation */}
          <section className="space-y-2 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Account creation</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-hover p-3">
              <div className="flex items-center gap-2">
                <LockOpen size={18} className="text-primary" />
                <div>
                  <p className="text-caption text-muted">Temporary password</p>
                  <p className="font-mono text-body font-medium text-foreground">{tempPassword}</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setTempPassword(genTempPassword())}>
                <ArrowsRepeat size={15} /> Regenerate
              </Button>
            </div>
            <p className="text-caption text-muted">This password will be included in the activation notification. The {isOwner ? "owner" : "tenant"} must change it on first login.</p>
          </section>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting} className={cn(isSubmitting && "opacity-90")}>Create {isOwner ? "owner" : "tenant"} account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
