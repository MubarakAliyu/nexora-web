"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { verifyTwoFactor } from "@/lib/api/auth";
import { useSession } from "@/lib/stores/session";
import { portalForRole } from "@/lib/roles";

export default function TwoFactorPage() {
  const router = useRouter();
  const pending = useSession((s) => s.pending);
  const setSession = useSession((s) => s.login);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await verifyTwoFactor(code);
    setLoading(false);
    if (res.ok) {
      const user =
        pending ?? {
          id: "u_1",
          name: "Admin",
          email: "admin@nexora.co.ug",
          role: "super_admin" as const,
        };
      setSession(user);
      toast.success("Verified", { description: "Signing you in…" });
      router.push(portalForRole(user.role));
    } else {
      toast.error("Invalid code", { description: "Enter the 6-digit code." });
    }
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">
        Two-factor authentication
      </h1>
      <p className="mt-2 text-body text-muted">
        Enter the 6-digit code from your authenticator app. (Demo: any 6 digits.)
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label="6-digit verification code"
          placeholder="••••••"
          className="text-center text-h2 tracking-[0.5em]"
        />
        <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
          Verify
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
