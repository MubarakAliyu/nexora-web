"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InfoCircle } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  addOperationalStaff, updateOperationalStaff, DEPARTMENT_LABEL,
  type Staff, type StaffDepartment,
} from "@/lib/api/admin";

const schema = z.object({
  name: z.string().min(2, "Enter the full name"),
  phone: z.string().min(6, "Enter a phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  department: z.string().min(1, "Choose a department"),
  jobTitle: z.string().min(2, "Enter a job title"),
  availability: z.string().min(1),
  address: z.string().optional(),
  startDate: z.string().min(1, "Choose a start date"),
});
type Values = z.infer<typeof schema>;

const DEPARTMENTS = Object.keys(DEPARTMENT_LABEL) as StaffDepartment[];

/**
 * Add / edit a FIELD WORKER. Deliberately has no role, password or credential
 * fields — operational staff receive job assignments but never sign in.
 * Separate from the system-user invite modal by design.
 */
export function OperationalStaffDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Staff | null;
  onDone: () => void;
}) {
  const isEdit = !!editing;
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", department: "cleaning", jobTitle: "", availability: "available", address: "", startDate: today },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(editing
      ? {
          name: editing.name, phone: editing.phone ?? "", email: editing.email ?? "",
          department: (editing.department as string) || "cleaning",
          jobTitle: editing.jobTitle ?? "", availability: editing.availability ?? "available",
          address: editing.address ?? "", startDate: editing.since.slice(0, 10),
        }
      : { name: "", phone: "", email: "", department: "cleaning", jobTitle: "", availability: "available", address: "", startDate: today });
  }, [open, editing, reset, today]);

  const onSubmit = async (v: Values) => {
    const payload = {
      name: v.name, phone: v.phone, email: v.email || undefined,
      department: v.department as StaffDepartment, jobTitle: v.jobTitle,
      availability: v.availability as Staff["availability"],
      address: v.address, startDate: v.startDate,
    };
    try {
      if (isEdit && editing) {
        await updateOperationalStaff(editing.id, payload);
        toast.success("Operational staff updated", { description: `${v.name}, ${DEPARTMENT_LABEL[v.department as StaffDepartment]}` });
      } else {
        await addOperationalStaff(payload);
        toast.success(`Operational staff added — ${v.name}, ${DEPARTMENT_LABEL[v.department as StaffDepartment]}`);
      }
      onOpenChange(false); onDone();
    } catch { toast.error(isEdit ? "Couldn’t update staff" : "Couldn’t add staff"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${editing?.name}` : "Add Operational Staff"}</DialogTitle>
          <DialogDescription>Field workers who receive job assignments.</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-hover p-3 text-caption text-muted">
          <span className="mt-0.5 shrink-0 text-primary"><InfoCircle size={16} /></span>
          <p>Operational staff perform field work and receive job assignments. They do not have platform login access.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="os-name" error={errors.name?.message}>
              <Input id="os-name" {...register("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Phone" htmlFor="os-phone" error={errors.phone?.message}>
              <Input id="os-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            </Field>
            <Field label="Email (optional)" htmlFor="os-email" error={errors.email?.message}>
              <Input id="os-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
              <p className="mt-1 text-caption text-muted">Optional. Used for job notifications if available.</p>
            </Field>
            <Field label="Department" htmlFor="os-dept" error={errors.department?.message}>
              <select id="os-dept" className={selectClass} {...register("department")} aria-invalid={!!errors.department}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABEL[d]}</option>)}
              </select>
            </Field>
            <Field label="Job title" htmlFor="os-title" error={errors.jobTitle?.message}>
              <Input id="os-title" placeholder="e.g. Senior Cleaner" {...register("jobTitle")} aria-invalid={!!errors.jobTitle} />
            </Field>
            <Field label="Availability" htmlFor="os-avail">
              <select id="os-avail" className={selectClass} {...register("availability")}>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="on_leave">On leave</option>
              </select>
            </Field>
            <Field label="Address (optional)" htmlFor="os-addr">
              <Input id="os-addr" {...register("address")} />
            </Field>
            <Field label="Start date" htmlFor="os-start" error={errors.startDate?.message}>
              <Input id="os-start" type="date" {...register("startDate")} aria-invalid={!!errors.startDate} />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add staff"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
