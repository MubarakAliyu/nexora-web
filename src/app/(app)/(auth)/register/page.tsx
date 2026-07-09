"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { register as registerUser } from "@/lib/api/auth";
import { useSession } from "@/lib/stores/session";
import { portalForRole } from "@/lib/roles";

// NOTE: per the PRD, account creation is admin-only in production. The UI is
// built now; wire it behind an admin permission at integration.
const schema = z
  .object({
    name: z.string().min(2, "Please enter your name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.login);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    try {
      const session = await registerUser(v.name, v.email, v.password);
      setSession(session.user);
      toast.success("Account created", { description: "Welcome to Nexora." });
      router.push(portalForRole(session.user.role));
    } catch {
      toast.error("Couldn’t create account", { description: "Please try again." });
    }
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Create account</h1>
      <p className="mt-2 text-body text-muted">Set up your Nexora platform account.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="Full name" htmlFor="r-name" error={errors.name?.message}>
          <Input id="r-name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="r-email" error={errors.email?.message}>
          <Input id="r-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="r-password" error={errors.password?.message}>
          <Input id="r-password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
        </Field>
        <Field label="Confirm password" htmlFor="r-confirm" error={errors.confirm?.message}>
          <Input id="r-confirm" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-body text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
