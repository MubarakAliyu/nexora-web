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
  subject: z.string().min(1, "Select a subject"),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});
type Values = z.infer<typeof schema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { subject: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await submitLead({
        type: "contact",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        meta: { subject: v.subject },
      });
      toast.success("Message sent", { description: "Thank you — we’ll respond shortly." });
      reset();
    } catch {
      toast.error("Couldn’t send your message", { description: "Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" error={errors.name?.message}>
          <Input id="c-name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message}>
          <Input id="c-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" htmlFor="c-phone">
          <Input id="c-phone" type="tel" {...register("phone")} />
        </Field>
        <Field label="Subject" htmlFor="c-subject" error={errors.subject?.message}>
          <select id="c-subject" className={selectClass} aria-invalid={!!errors.subject} {...register("subject")}>
            <option value="">Select…</option>
            <option>General enquiry</option>
            <option>Request a quote</option>
            <option>Property assessment</option>
            <option>Investor enquiry</option>
            <option>Careers</option>
          </select>
        </Field>
      </div>
      <Field label="Message" htmlFor="c-message" error={errors.message?.message}>
        <Textarea id="c-message" rows={5} {...register("message")} aria-invalid={!!errors.message} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Send message
      </Button>
    </form>
  );
}
