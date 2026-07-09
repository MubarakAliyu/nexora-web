"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/api/auth";

export default function VerifyEmailPage() {
  const [status, setStatus] = React.useState<"verifying" | "done">("verifying");

  React.useEffect(() => {
    let active = true;
    verifyEmail("mock-token").then(() => {
      if (active) setStatus("done");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="text-center">
      {status === "verifying" ? (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-active text-primary">
            <Spinner size={26} />
          </span>
          <h1 className="mt-5 font-heading text-h1 font-semibold text-foreground">
            Verifying your email…
          </h1>
          <p className="mt-2 text-body text-muted">This will only take a moment.</p>
        </>
      ) : (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-active text-primary">
            <CheckCircle size={28} />
          </span>
          <h1 className="mt-5 font-heading text-h1 font-semibold text-foreground">
            Email verified
          </h1>
          <p className="mt-2 text-body text-muted">
            Your email address has been confirmed. You can now sign in.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </>
      )}
    </div>
  );
}
