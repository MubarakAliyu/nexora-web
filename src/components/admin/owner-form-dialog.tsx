"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { createOwner, updateOwner, type Owner } from "@/lib/api/admin";

const schema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone number"),
  company: z.string().optional(),
  nationality: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function OwnerFormDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Owner | null; onDone?: () => void;
}) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", company: "", nationality: "", bankName: "", accountNumber: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset(editing
        ? { name: editing.name, email: editing.email, phone: editing.phone, company: editing.company ?? "", nationality: editing.nationality ?? "", bankName: editing.bankName ?? "", accountNumber: editing.accountNumber ?? "" }
        : { name: "", email: "", phone: "", company: "", nationality: "", bankName: "", accountNumber: "" });
    }
  }, [open, editing, reset]);

  const onSubmit = async (v: Values) => {
    try {
      if (isEdit && editing) { await updateOwner(editing.id, v); toast.success("Owner updated", { description: `${v.name} was saved.` }); }
      else { await createOwner(v); toast.success("Owner added", { description: `${v.name} was added.` }); }
      onOpenChange(false); onDone?.();
    } catch { toast.error(isEdit ? "Couldn’t update owner" : "Couldn’t add owner"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit owner" : "Add an owner"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this owner’s profile and disbursement details." : "Register a new property owner."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="ow-name" error={errors.name?.message}><Input id="ow-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="ow-email" error={errors.email?.message}><Input id="ow-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Phone" htmlFor="ow-phone" error={errors.phone?.message}><Input id="ow-phone" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="Company (optional)" htmlFor="ow-co"><Input id="ow-co" {...register("company")} /></Field>
            <Field label="Nationality (optional)" htmlFor="ow-nat"><Input id="ow-nat" {...register("nationality")} /></Field>
            <Field label="Bank (optional)" htmlFor="ow-bank"><Input id="ow-bank" {...register("bankName")} /></Field>
          </div>
          <Field label="Account number (optional)" htmlFor="ow-acct"><Input id="ow-acct" type="password" autoComplete="off" {...register("accountNumber")} /></Field>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add owner"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
