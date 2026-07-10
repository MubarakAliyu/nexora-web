"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Envelope } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { requestPasswordReset } from "@/lib/api/auth";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState<{ email: string; token: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    const res = await requestPasswordReset(v.email);
    setSent({ email: v.email, token: res.token });
  };

  if (sent) {
    // Demo convenience: if the email matched a seed account we minted a token —
    // link straight to the reset screen; otherwise the link carries no token so
    // you can see the invalid-token state.
    const href = sent.token ? `/reset-password?token=${encodeURIComponent(sent.token)}` : "/reset-password";
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-active text-primary">
          <Envelope size={26} />
        </span>
        <h1 className="mt-5 font-heading text-h1 font-semibold text-foreground">Check your email</h1>
        <p className="mt-2 text-body text-muted">
          If an account exists for <span className="font-medium text-foreground">{sent.email}</span>, we’ve sent a
          link to reset your password. The link expires in 30 minutes.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href={href}>Continue to reset {sent.token ? "" : "(demo)"}</Link>
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
      <h1 className="font-heading text-h1 font-semibold text-foreground">Forgot password?</h1>
      <p className="mt-2 text-body text-muted">
        Enter your email and we’ll send you a link to reset it.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="Email" htmlFor="fp-email" error={errors.email?.message}>
          <Input id="fp-email" type="email" autoComplete="email" placeholder="you@nexora.co.ug" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send reset link
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
