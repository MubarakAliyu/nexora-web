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
import { Field } from "@/components/forms/field";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { login, InvalidCredentialsError } from "@/lib/api/auth";
import { useSession } from "@/lib/stores/session";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

/** Demo accounts for quick review — click to fill. Removed at backend integration. */
const demoAccounts = [
  { label: "Super Admin", email: "admin@nexora.co.ug" },
  { label: "Property Manager", email: "manager@nexora.co.ug" },
  { label: "Finance Officer", email: "finance@nexora.co.ug" },
  { label: "Owner", email: "salim@gmail.com" },
  { label: "Tenant", email: "mubarak@gmail.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const setPending = useSession((s) => s.setPending);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (v: Values) => {
    setAuthError(null);
    try {
      const { user } = await login(v.email, v.password);
      // Every sign-in is confirmed with a 6-digit code before the session is set.
      setPending(user);
      toast.success("Verify it’s you", { description: "Enter your 6-digit code to continue." });
      router.push("/2fa");
    } catch (e) {
      if (e instanceof InvalidCredentialsError) {
        setAuthError("Incorrect email or password.");
        toast.error("Sign in failed", { description: "Check your email and password." });
      } else {
        toast.error("Something went wrong", { description: "Please try again." });
      }
    }
  };

  const fill = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "123456", { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Sign in</h1>
      <p className="mt-2 text-body text-muted">Welcome back to the Nexora platform.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        {authError && (
          <div role="alert" className="rounded-md border border-primary/40 bg-primary/5 px-3.5 py-2.5 text-body text-foreground">
            {authError}
          </div>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@nexora.co.ug" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} />
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

      {/* Demo quick-fill — remove at backend integration */}
      <div className="mt-8 rounded-lg border border-dashed border-border bg-surface-hover/40 p-4">
        <p className="text-caption font-medium uppercase tracking-wide text-muted">Demo accounts · password 123456</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => fill(a.email)}
              className="rounded-full border border-border bg-background px-3 py-1 text-caption font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-body text-muted">
        Don’t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}
