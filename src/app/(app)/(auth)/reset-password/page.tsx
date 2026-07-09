"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { resetPassword } from "@/lib/api/auth";

// Token-based reset (token is mocked here; read from the URL at integration).
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    try {
      await resetPassword("mock-reset-token", v.password);
      toast.success("Password reset", { description: "You can now sign in." });
      router.push("/login");
    } catch {
      toast.error("Couldn’t reset password", { description: "Please try again." });
    }
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Set a new password</h1>
      <p className="mt-2 text-body text-muted">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
        <Field label="New password" htmlFor="rp-password" error={errors.password?.message}>
          <Input id="rp-password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
        </Field>
        <Field label="Confirm password" htmlFor="rp-confirm" error={errors.confirm?.message}>
          <Input id="rp-confirm" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}
