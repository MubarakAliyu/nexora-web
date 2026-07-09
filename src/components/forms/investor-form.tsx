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
  phone: z.string().optional(),
  country: z.string().min(2, "Where are you based?"),
  interest: z.string().min(1, "Select your interest"),
  message: z.string().min(10, "Tell us about your goals (10+ characters)"),
});
type Values = z.infer<typeof schema>;

export function InvestorForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { interest: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await submitLead({
        type: "investor",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        meta: { country: v.country, interest: v.interest },
      });
      toast.success("Consultation requested", {
        description: "An investor advisor will reach out to you.",
      });
      reset();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="i-name" error={errors.name?.message}>
          <Input id="i-name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="i-email" error={errors.email?.message}>
          <Input id="i-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country of residence" htmlFor="i-country" error={errors.country?.message}>
          <Input id="i-country" placeholder="e.g. United Kingdom" {...register("country")} aria-invalid={!!errors.country} />
        </Field>
        <Field label="I'm interested in" htmlFor="i-interest" error={errors.interest?.message}>
          <select id="i-interest" className={selectClass} aria-invalid={!!errors.interest} {...register("interest")}>
            <option value="">Select…</option>
            <option>Managing a property I own</option>
            <option>Investing in a new property</option>
            <option>Rental-income management</option>
            <option>Portfolio advisory</option>
          </select>
        </Field>
      </div>
      <Field label="Phone (optional)" htmlFor="i-phone">
        <Input id="i-phone" type="tel" {...register("phone")} />
      </Field>
      <Field label="Your goals" htmlFor="i-message" error={errors.message?.message}>
        <Textarea id="i-message" rows={5} {...register("message")} aria-invalid={!!errors.message} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Book a consultation
      </Button>
    </form>
  );
}
