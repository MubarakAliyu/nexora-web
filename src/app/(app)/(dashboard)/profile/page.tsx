"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";

const delay = () => new Promise((r) => setTimeout(r, 800));

const profileSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const user = useSession((s) => s.user);
  const login = useSession((s) => s.login);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", email: user?.email ?? "", phone: "" },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (v: ProfileValues) => {
    await delay();
    if (user) login({ ...user, name: v.name, email: v.email });
    toast.success("Profile updated", { description: "Your details have been saved." });
  };

  const onChangePassword = async (_v: PasswordValues) => {
    await delay();
    toast.success("Password changed", { description: "Your password has been updated." });
    passwordForm.reset();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Manage your personal details and password" />

      {/* Personal details */}
      <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-h3">{initials(user?.name ?? "U")}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-h3 font-semibold text-foreground">{user?.name}</p>
            <button
              type="button"
              onClick={() => toast.info("Photo upload", { description: "Avatar upload is mocked in this build." })}
              className="mt-1 text-caption font-medium text-primary transition-colors hover:text-accent"
            >
              Upload photo
            </button>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="p-name" error={profileForm.formState.errors.name?.message}>
              <Input id="p-name" {...profileForm.register("name")} aria-invalid={!!profileForm.formState.errors.name} />
            </Field>
            <Field label="Email" htmlFor="p-email" error={profileForm.formState.errors.email?.message}>
              <Input id="p-email" type="email" {...profileForm.register("email")} aria-invalid={!!profileForm.formState.errors.email} />
            </Field>
          </div>
          <Field label="Phone (optional)" htmlFor="p-phone">
            <Input id="p-phone" type="tel" {...profileForm.register("phone")} />
          </Field>
          <Button type="submit" loading={profileForm.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </div>

      {/* Password */}
      <div className="mt-6 rounded-xl border border-border bg-surface-elevated p-6 shadow-sm md:p-8">
        <h2 className="font-heading text-h3 font-semibold text-foreground">Change password</h2>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} noValidate className="mt-6 space-y-4">
          <Field label="Current password" htmlFor="cur" error={passwordForm.formState.errors.current?.message}>
            <Input id="cur" type="password" autoComplete="current-password" {...passwordForm.register("current")} aria-invalid={!!passwordForm.formState.errors.current} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="new" error={passwordForm.formState.errors.password?.message}>
              <Input id="new" type="password" autoComplete="new-password" {...passwordForm.register("password")} aria-invalid={!!passwordForm.formState.errors.password} />
            </Field>
            <Field label="Confirm password" htmlFor="conf" error={passwordForm.formState.errors.confirm?.message}>
              <Input id="conf" type="password" autoComplete="new-password" {...passwordForm.register("confirm")} aria-invalid={!!passwordForm.formState.errors.confirm} />
            </Field>
          </div>
          <Button type="submit" loading={passwordForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
