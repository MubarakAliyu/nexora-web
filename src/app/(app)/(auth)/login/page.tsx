"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, selectClass } from "@/components/forms/field";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { login } from "@/lib/api/auth";
import { useSession } from "@/lib/stores/session";
import { portalForRole, requires2fa, roleLabels, type Role } from "@/lib/roles";

const devRoles: Role[] = ["super_admin", "property_manager", "finance_officer", "owner", "tenant"];

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  role: z.string(),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.login);
  const setPending = useSession((s) => s.setPending);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@nexora.co.ug", password: "password", role: "super_admin" },
  });

  const onSubmit = async (v: Values) => {
    try {
      const session = await login(v.email, v.password, v.role as Role);
      if (requires2fa(session.user.role)) {
        setPending(session.user);
        toast.info("Verify it's you", { description: "Enter the 6-digit code to continue." });
        router.push("/2fa");
      } else {
        setSession(session.user);
        toast.success("Welcome back", { description: "Signing you in…" });
        router.push(portalForRole(session.user.role));
      }
    } catch {
      toast.error("Sign in failed", { description: "Check your details and try again." });
    }
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Sign in</h1>
      <p className="mt-2 text-body text-muted">Welcome back to the Nexora platform.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} />
        </Field>

        <Field label="Sign in as (demo role)" htmlFor="role">
          <select id="role" className={selectClass} {...register("role")}>
            {devRoles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" defaultChecked />
            <Label htmlFor="remember" className="font-normal text-muted">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-body font-medium text-primary hover:text-accent">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-body text-muted">
        Don’t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}
