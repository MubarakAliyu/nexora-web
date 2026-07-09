"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { submitLead } from "@/lib/api/leads";
import { Field, selectClass } from "./field";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
  propertyType: z.string().min(1, "Select a property type"),
  message: z.string().min(10, "Tell us about your property (10+ characters)"),
});
type Values = z.infer<typeof schema>;

export function QuoteForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { propertyType: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await submitLead({
        type: "quote",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        meta: { propertyType: v.propertyType },
      });
      toast.success("Quote request received", {
        description: "We’ll prepare a tailored proposal and be in touch.",
      });
      reset();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="q-name" error={errors.name?.message}>
          <Input id="q-name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="q-email" error={errors.email?.message}>
          <Input id="q-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="q-phone" error={errors.phone?.message}>
          <Input id="q-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Property type" htmlFor="q-type" error={errors.propertyType?.message}>
          <select id="q-type" className={selectClass} aria-invalid={!!errors.propertyType} {...register("propertyType")}>
            <option value="">Select…</option>
            <option>Residential</option>
            <option>Commercial</option>
            <option>Condominium</option>
            <option>Institutional</option>
            <option>Managed facility</option>
          </select>
        </Field>
      </div>
      <Field label="About your property" htmlFor="q-message" error={errors.message?.message}>
        <Textarea id="q-message" rows={5} {...register("message")} aria-invalid={!!errors.message} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Request a quote
      </Button>
    </form>
  );
}
