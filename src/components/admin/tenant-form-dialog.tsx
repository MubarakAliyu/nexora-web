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
import { createTenant, updateTenant, type Tenant } from "@/lib/api/admin";

const schema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone number"),
  nin: z.string().optional(),
  employer: z.string().optional(),
  emergencyContact: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function TenantFormDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Tenant | null; onDone?: () => void;
}) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", nin: "", employer: "", emergencyContact: "" },
  });

  React.useEffect(() => {
    if (open) {
      reset(editing
        ? { name: editing.name, email: editing.email, phone: editing.phone, nin: editing.nin ?? "", employer: editing.employer ?? "", emergencyContact: editing.emergencyContact ?? "" }
        : { name: "", email: "", phone: "", nin: "", employer: "", emergencyContact: "" });
    }
  }, [open, editing, reset]);

  const onSubmit = async (v: Values) => {
    try {
      if (isEdit && editing) { await updateTenant(editing.id, v); toast.success("Tenant updated", { description: `${v.name} was saved.` }); }
      else { await createTenant(v); toast.success("Tenant added", { description: `${v.name} was added.` }); }
      onOpenChange(false); onDone?.();
    } catch { toast.error(isEdit ? "Couldn’t update tenant" : "Couldn’t add tenant"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tenant" : "Add a tenant"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this tenant’s profile." : "Register a new tenant. Assign a unit by creating a lease."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="tn-name" error={errors.name?.message}><Input id="tn-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="tn-email" error={errors.email?.message}><Input id="tn-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Phone" htmlFor="tn-phone" error={errors.phone?.message}><Input id="tn-phone" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="NIN / Passport (optional)" htmlFor="tn-nin"><Input id="tn-nin" {...register("nin")} /></Field>
            <Field label="Employer (optional)" htmlFor="tn-emp"><Input id="tn-emp" {...register("employer")} /></Field>
            <Field label="Emergency contact (optional)" htmlFor="tn-ec"><Input id="tn-ec" {...register("emergencyContact")} /></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add tenant"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
