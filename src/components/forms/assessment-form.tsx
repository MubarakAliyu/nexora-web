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
  location: z.string().min(2, "Where is the property?"),
  propertyType: z.string().min(1, "Select a property type"),
  message: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function AssessmentForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { propertyType: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await submitLead({
        type: "assessment",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        meta: { location: v.location, propertyType: v.propertyType },
      });
      toast.success("Assessment requested", {
        description: "Our team will arrange your free assessment.",
      });
      reset();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="a-name" error={errors.name?.message}>
          <Input id="a-name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="a-email" error={errors.email?.message}>
          <Input id="a-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="a-phone" error={errors.phone?.message}>
          <Input id="a-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Property location" htmlFor="a-location" error={errors.location?.message}>
          <Input id="a-location" placeholder="e.g. Kololo, Kampala" {...register("location")} aria-invalid={!!errors.location} />
        </Field>
      </div>
      <Field label="Property type" htmlFor="a-type" error={errors.propertyType?.message}>
        <select id="a-type" className={selectClass} aria-invalid={!!errors.propertyType} {...register("propertyType")}>
          <option value="">Select…</option>
          <option>Residential</option>
          <option>Commercial</option>
          <option>Condominium</option>
          <option>Institutional</option>
          <option>Managed facility</option>
        </select>
      </Field>
      <Field label="Anything else? (optional)" htmlFor="a-message">
        <Textarea id="a-message" rows={4} {...register("message")} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Request free assessment
      </Button>
    </form>
  );
}
