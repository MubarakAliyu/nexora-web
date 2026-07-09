"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "@/components/ui/sonner";
import { submitLead } from "@/lib/api/leads";
import { Field } from "./field";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
  position: z.string().min(2, "Which role are you applying for?"),
  coverLetter: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function JobApplicationForm({ defaultPosition = "" }: { defaultPosition?: string }) {
  const [cv, setCv] = React.useState<File[]>([]);
  const [cvError, setCvError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", position: defaultPosition, coverLetter: "" },
  });

  // Prefill the position when a role is chosen, without clearing other fields.
  React.useEffect(() => {
    if (defaultPosition) setValue("position", defaultPosition);
  }, [defaultPosition, setValue]);

  const onSubmit = async (v: Values) => {
    if (cv.length === 0) {
      setCvError("Please attach your CV");
      return;
    }
    try {
      await submitLead({
        type: "job",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.coverLetter,
        meta: { position: v.position, cv: cv[0]?.name },
      });
      toast.success("Application submitted", {
        description: "Thank you — we’ll review it and be in touch.",
      });
      reset();
      setCv([]);
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="j-name" error={errors.name?.message}>
          <Input id="j-name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="j-email" error={errors.email?.message}>
          <Input id="j-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="j-phone" error={errors.phone?.message}>
          <Input id="j-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Position" htmlFor="j-position" error={errors.position?.message}>
          <Input id="j-position" {...register("position")} aria-invalid={!!errors.position} />
        </Field>
      </div>
      <Field label="Cover letter (optional)" htmlFor="j-cover">
        <Textarea id="j-cover" rows={4} {...register("coverLetter")} />
      </Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">CV / résumé</p>
        <FileUpload
          accept="PDF, DOC, DOCX"
          multiple={false}
          onFiles={(files) => {
            setCv(files);
            if (files.length) setCvError(null);
          }}
        />
        {cvError && (
          <p role="alert" className="text-caption text-primary">
            {cvError}
          </p>
        )}
      </div>
      <Button type="submit" loading={isSubmitting}>
        Submit application
      </Button>
    </form>
  );
}
