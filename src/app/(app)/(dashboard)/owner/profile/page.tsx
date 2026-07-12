"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeSlash, LockOpen } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone number"),
  address: z.string().min(4, "Enter an address"),
  bankName: z.string().min(2, "Enter a bank name"),
  accountName: z.string().min(2, "Enter the account name"),
  accountNumber: z.string().regex(/^\d{6,}$/, "Enter a valid account number"),
  swift: z.string().min(4, "Enter a branch / SWIFT"),
});
type Values = z.infer<typeof schema>;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function OwnerProfilePage() {
  const user = useSession((s) => s.user);
  const [showAccount, setShowAccount] = React.useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "Salim Kato",
      email: user?.email ?? "salim@gmail.com",
      phone: "+256 772 114 220",
      address: "Plot 8, Kololo Hill Drive, Kampala",
      bankName: "Stanbic Bank Uganda",
      accountName: user?.name ?? "Salim Kato",
      accountNumber: "9030012345678",
      swift: "SBICUGKX",
    },
  });
  const acct = watch("accountNumber") ?? "";
  const masked = acct.length > 4 ? `•••• •••• ${acct.slice(-4)}` : acct;

  const onSubmit = async (_v: Values) => {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Profile updated", { description: "Your details have been saved." });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Your personal and disbursement details" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-16 w-16"><AvatarFallback className="text-h3">{initials(user?.name ?? "Salim Kato")}</AvatarFallback></Avatar>
            <div>
              <p className="font-heading text-h3 font-semibold text-foreground">{user?.name ?? "Salim Kato"}</p>
              <p className="text-caption text-muted">Property Owner</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="pf-name" error={errors.name?.message}><Input id="pf-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="pf-email" error={errors.email?.message}><Input id="pf-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Phone" htmlFor="pf-phone" error={errors.phone?.message}><Input id="pf-phone" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="Address" htmlFor="pf-addr" error={errors.address?.message}><Input id="pf-addr" {...register("address")} aria-invalid={!!errors.address} /></Field>
          </div>
        </Card>

        {/* Sensitive: disbursement / bank details */}
        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-primary"><LockOpen size={18} /></span>
            <h2 className="font-heading text-h3 font-semibold text-foreground">Disbursement details</h2>
          </div>
          <p className="mb-4 text-caption text-muted">Where Nexora sends your monthly net disbursement. Kept private and shown masked.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank" htmlFor="pf-bank" error={errors.bankName?.message}><Input id="pf-bank" {...register("bankName")} aria-invalid={!!errors.bankName} /></Field>
            <Field label="Account name" htmlFor="pf-acctname" error={errors.accountName?.message}><Input id="pf-acctname" {...register("accountName")} aria-invalid={!!errors.accountName} /></Field>
            <Field label="Account number" htmlFor="pf-acct" error={errors.accountNumber?.message}>
              <div className="relative">
                <Input id="pf-acct" type={showAccount ? "text" : "password"} inputMode="numeric" autoComplete="off" {...register("accountNumber")} aria-invalid={!!errors.accountNumber} className="pr-10" />
                <button type="button" onClick={() => setShowAccount((v) => !v)} aria-label={showAccount ? "Hide account number" : "Show account number"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground">
                  {showAccount ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!showAccount && acct && <p className="mt-1 text-caption text-muted">Masked: {masked}</p>}
            </Field>
            <Field label="Branch / SWIFT" htmlFor="pf-swift" error={errors.swift?.message}><Input id="pf-swift" {...register("swift")} aria-invalid={!!errors.swift} /></Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}
