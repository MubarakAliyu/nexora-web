"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExclamationCircle } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { resetPassword, isValidResetToken } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });
type Values = z.infer<typeof schema>;

function strengthOf(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][score];
  return { score, label };
}

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const valid = isValidResetToken(token);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });
  const pw = watch("password") ?? "";
  const strength = strengthOf(pw);

  const onSubmit = async (v: Values) => {
    try {
      await resetPassword(token ?? "", v.password);
      toast.success("Password reset", { description: "Sign in with your new password." });
      router.replace("/login");
    } catch {
      toast.error("Couldn’t reset password", { description: "Your link may have expired." });
    }
  };

  if (!valid) {
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ExclamationCircle size={26} />
        </span>
        <h1 className="mt-5 font-heading text-h1 font-semibold text-foreground">Invalid or expired link</h1>
        <p className="mt-2 text-body text-muted">
          This password-reset link is invalid or has expired. Request a fresh one to continue.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <p className="mt-6 text-body text-muted">
          <Link href="/login" className="font-medium text-primary hover:text-accent">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Set a new password</h1>
      <p className="mt-2 text-body text-muted">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="New password" htmlFor="rp-password" error={errors.password?.message}>
          <Input id="rp-password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
        </Field>

        {pw.length > 0 && (
          <div aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < strength.score ? "bg-primary" : "bg-border",
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-caption text-muted">
              Password strength: <span className="font-medium text-foreground">{strength.label}</span>
            </p>
          </div>
        )}

        <Field label="Confirm password" htmlFor="rp-confirm" error={errors.confirm?.message}>
          <Input id="rp-confirm" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-body text-muted">
        <Link href="/login" className="font-medium text-primary hover:text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="h-64" />}>
      <ResetForm />
    </React.Suspense>
  );
}
