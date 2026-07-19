"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { createRentalInquiry, type RentalListing } from "@/lib/api/rentals";
import type { Unit } from "@/lib/mock/types";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
  preferredUnit: z.string().optional(),
  moveInDate: z.string().optional(),
  leaseDuration: z.string().min(1, "Choose a lease duration"),
  employment: z.string().optional(),
  message: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function RentalInquiryForm({ property, units }: { property: RentalListing; units: Unit[] }) {
  const [done, setDone] = React.useState(false);
  const [reference, setReference] = React.useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { leaseDuration: "", preferredUnit: "", moveInDate: "" },
  });

  const onSubmit = async (v: Values) => {
    try {
      const { reference } = await createRentalInquiry({
        propertyId: property.id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        preferredUnit: v.preferredUnit || undefined,
        moveInDate: v.moveInDate || undefined,
        leaseDuration: v.leaseDuration,
        employment: v.employment || undefined,
        message: v.message || undefined,
      });
      setReference(reference);
      setDone(true);
      toast.success("Inquiry submitted", { description: `Reference ${reference}` });
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  if (done) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex flex-col items-center py-10 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle size={36} className="text-primary" />
          </span>
          <h3 className="mt-5 font-heading text-h2 font-semibold text-foreground">Inquiry received</h3>
          <p className="mt-2 max-w-sm text-body text-muted">
            Our team will contact you within 24 hours with a quotation for {property.name}.
          </p>
          <div className="mt-5 rounded-lg border border-border bg-surface-hover px-5 py-3 text-body">
            <span className="text-muted">Reference </span>
            <span className="font-semibold text-foreground">{reference}</span>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild><Link href="/rentals">Browse more rentals</Link></Button>
            <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background p-5 shadow-sm md:p-6">
      <h3 className="font-heading text-h3 font-semibold text-foreground">Submit an inquiry</h3>
      <p className="mt-1 text-caption text-muted">
        Long-term homes are arranged by our team — no online payment. We&rsquo;ll reply with a tailored quotation within 24 hours.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="iq-name" error={errors.name?.message}>
            <Input id="iq-name" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Email" htmlFor="iq-email" error={errors.email?.message}>
            <Input id="iq-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="iq-phone" error={errors.phone?.message}>
            <Input id="iq-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
          </Field>
          <Field label="Preferred unit (optional)" htmlFor="iq-unit">
            <select id="iq-unit" className={selectClass} {...register("preferredUnit")}>
              <option value="">No preference</option>
              {units.map((u) => <option key={u.id} value={u.label}>{u.label} · {u.type}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desired move-in date" htmlFor="iq-movein">
            <Input id="iq-movein" type="date" {...register("moveInDate")} />
          </Field>
          <Field label="Lease duration" htmlFor="iq-dur" error={errors.leaseDuration?.message}>
            <select id="iq-dur" className={selectClass} aria-invalid={!!errors.leaseDuration} {...register("leaseDuration")}>
              <option value="">Select…</option>
              <option value="6 months">6 months</option>
              <option value="1 year">1 year</option>
              <option value="2 years">2 years</option>
              <option value="3+ years">3+ years</option>
            </select>
          </Field>
        </div>
        <Field label="Employment details (optional)" htmlFor="iq-emp">
          <Input id="iq-emp" placeholder="Employer / occupation" {...register("employment")} />
        </Field>
        <Field label="Message (optional)" htmlFor="iq-msg">
          <Textarea id="iq-msg" rows={3} placeholder="Anything we should know?" {...register("message")} />
        </Field>
        <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting}>Submit inquiry</Button>
      </form>
    </div>
  );
}
