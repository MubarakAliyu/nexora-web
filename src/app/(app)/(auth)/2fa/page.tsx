"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { verifyTwoFactor } from "@/lib/api/auth";
import { useSession } from "@/lib/stores/session";
import { portalForRole } from "@/lib/roles";

export default function TwoFactorPage() {
  const router = useRouter();
  const pending = useSession((s) => s.pending);
  const user = useSession((s) => s.user);
  const setSession = useSession((s) => s.login);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Reached without signing in first (e.g. direct nav / reload) — no pending user
  // and not already signed in. (Don't redirect once verification sets the session,
  // which clears `pending`.)
  React.useEffect(() => {
    if (mounted && !pending && !user) router.replace("/login");
  }, [mounted, pending, user, router]);

  if (!mounted || !pending) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verifyTwoFactor(code);
    setLoading(false);
    if (res.ok) {
      setSession(pending);
      toast.success("Verified", { description: `Welcome back, ${pending.name.split(" ")[0]}.` });
      router.replace(portalForRole(pending.role));
    } else {
      setError("That code isn’t right. Try again.");
      toast.error("Invalid code", { description: "Enter your 6-digit verification code." });
    }
  };

  return (
    <div>
      <h1 className="font-heading text-h1 font-semibold text-foreground">Two-factor authentication</h1>
      <p className="mt-2 text-body text-muted">
        We’ve sent a 6-digit code to verify it’s you. Enter it below to finish signing in.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <Field label="Verification code" htmlFor="code" error={error ?? undefined}>
          <Input
            id="code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            aria-label="6-digit verification code"
            aria-invalid={!!error}
            placeholder="••••••"
            className="text-center text-h2 tracking-[0.5em]"
          />
        </Field>
        <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
          Verify &amp; sign in
        </Button>
      </form>

      <p className="mt-4 rounded-md border border-dashed border-border bg-surface-hover/40 px-3.5 py-2.5 text-caption text-muted">
        Demo code: <span className="font-medium text-foreground">123456</span>
      </p>

      <p className="mt-6 text-body text-muted">
        <Link href="/login" className="font-medium text-primary hover:text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
