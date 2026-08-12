"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck } from "flowbite-react-icons/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/stores/session";
import { portalForRole } from "@/lib/roles";
import { changePassword } from "@/lib/api/auth";
import { recordMutation } from "@/lib/api/actions";

const schema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/\d/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don’t match", path: ["confirm"] })
  .refine((d) => d.password !== d.current, { message: "New password must differ from the current one", path: ["password"] });
type Values = z.infer<typeof schema>;

function strengthOf(pw: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too short", "Weak", "Medium", "Strong", "Strong"][score];
  // Palette only: weak/medium draw the eye in primary, strong reads calm.
  const tone = score <= 1 ? "bg-primary" : score === 2 ? "bg-primary/70" : "bg-accent";
  return { score, label, tone };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const complete = useSession((s) => s.completePasswordChange);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const pw = watch("password") ?? "";
  const strength = strengthOf(pw);

  const onSubmit = async (v: Values) => {
    if (!user) { router.replace("/login"); return; }
    try {
      await changePassword(user.id, v.current, v.password);
      recordMutation({
        entityType: "user", entityId: user.id, entityName: user.name, action: "updated",
        summary: `Password changed (first login) — ${user.name}`,
        notify: false,
      });
      complete();
      toast.success("Password changed successfully — welcome to Nexora");
      router.replace(portalForRole(user.role));
    } catch {
      toast.error("Couldn’t change password", { description: "Your current password is incorrect." });
    }
  };

  return (
    <div>
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck size={24} />
      </span>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Set Your New Password</h1>
      <p className="mt-2 text-body text-muted">For security, please change your temporary password before continuing.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="Current password" htmlFor="cp-current" error={errors.current?.message}>
          <Input id="cp-current" type="password" autoComplete="current-password" {...register("current")} aria-invalid={!!errors.current} />
        </Field>

        <Field label="New password" htmlFor="cp-new" error={errors.password?.message}>
          <Input id="cp-new" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
        </Field>
        {pw.length > 0 && (
          <div aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < strength.score ? strength.tone : "bg-border")} />
              ))}
            </div>
            <p className="mt-1.5 text-caption text-muted">Password strength: <span className="font-medium text-foreground">{strength.label}</span></p>
          </div>
        )}

        <Field label="Confirm new password" htmlFor="cp-confirm" error={errors.confirm?.message}>
          <Input id="cp-confirm" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} />
        </Field>

        <Button type="submit" loading={isSubmitting} className="w-full">Set new password &amp; continue</Button>
      </form>
    </div>
  );
}
