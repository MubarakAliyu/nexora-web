"use client";

import * as React from "react";
import { ExclamationCircle, ShieldCheck, FileCopy, CheckCircle } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  resetUserPassword, findUserAccount, maskEmail, maskPhone,
  VERIFICATION_METHOD_LABEL, type VerificationMethod, type ResettableUser,
} from "@/lib/api/password-reset";

const CHECKS = [
  { id: "email", label: "Registered email address confirmed" },
  { id: "phone", label: "Registered phone number confirmed" },
  { id: "id", label: "Government ID or supporting document verified" },
] as const;

type CheckId = (typeof CHECKS)[number]["id"];

/**
 * Admin-initiated password reset.
 *
 * The identity checklist gates everything below it deliberately: the PM's rule is
 * that a phone call alone is never enough, so the confirm button cannot enable
 * until all three confirmations are ticked and the verifier has written down how
 * they verified. Those notes become the audit record.
 *
 * The admin never sees the user's existing password — only a freshly generated
 * temporary one, shown once.
 */
export function ResetPasswordDialog({ entityId, entityName, open, onOpenChange }: {
  entityId: string;
  entityName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [checks, setChecks] = React.useState<Record<CheckId, boolean>>({ email: false, phone: false, id: false });
  const [method, setMethod] = React.useState<VerificationMethod>("phone_call");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [issued, setIssued] = React.useState<{ tempPassword: string; user: ResettableUser } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const account = React.useMemo(() => (open ? findUserAccount(entityId) : null), [open, entityId]);

  React.useEffect(() => {
    if (open) {
      setChecks({ email: false, phone: false, id: false });
      setMethod("phone_call");
      setNotes("");
      setIssued(null);
      setCopied(false);
    }
  }, [open]);

  const allChecked = CHECKS.every((c) => checks[c.id]);
  const canSubmit = allChecked && notes.trim().length >= 5 && !!account;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await resetUserPassword({ entityId, method, notes: notes.trim() });
      setIssued(res);
      toast.success(`Password reset — temporary credentials issued for ${res.user.name}`);
    } catch {
      toast.error("Couldn’t reset the password");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.tempPassword);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn’t copy — select the password and copy it manually");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {issued ? (
          /* ---- Issued: shown once, then gone ---- */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle size={20} className="text-primary" /> Password reset
              </DialogTitle>
              <DialogDescription>{issued.user.name} · {issued.user.email}</DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-caption font-medium uppercase tracking-wide text-muted">Temporary password</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded-md border border-border bg-background px-3 py-2 font-mono text-h3 font-semibold text-foreground">
                  {issued.tempPassword}
                </code>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
                  <FileCopy size={15} /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-3 text-body text-muted">
                Communicate this to {issued.user.name} through a verified channel. They will be
                required to change it on first login.{" "}
                <span className="font-medium text-foreground">This password will not be shown again.</span>
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>{entityName}</DialogDescription>
            </DialogHeader>

            {!account ? (
              <p className="rounded-lg border border-border bg-surface-hover p-4 text-body text-muted">
                This record has no login account, so there is no password to reset.
              </p>
            ) : (
              <div className="space-y-5">
                {/* --- 1. Identity verification --- */}
                <div className="rounded-xl border-l-4 border-accent bg-surface-hover p-4">
                  <p className="flex items-start gap-2 text-body font-medium text-foreground">
                    <ExclamationCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                    Verify the requester’s identity
                  </p>
                  <p className="mt-1.5 pl-6 text-caption text-muted">
                    Before resetting, confirm their registered details match our records.
                    Never reset a password based on a phone call alone.
                  </p>
                </div>

                <div className="space-y-3">
                  {CHECKS.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          id={`rp-${c.id}`}
                          checked={checks[c.id]}
                          onCheckedChange={(v) => setChecks((s) => ({ ...s, [c.id]: v === true }))}
                          className="mt-0.5"
                        />
                        <Label htmlFor={`rp-${c.id}`} className="font-normal text-foreground">{c.label}</Label>
                      </div>
                      {/* Registered value, masked — enough to compare against what the caller says. */}
                      {c.id === "email" && <span className="shrink-0 font-mono text-caption text-muted">{maskEmail(account.email)}</span>}
                      {c.id === "phone" && <span className="shrink-0 font-mono text-caption text-muted">{maskPhone(account.phone)}</span>}
                    </div>
                  ))}
                </div>

                {/* --- 2. Verification record --- */}
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <p className="flex items-center gap-2 text-body font-medium text-foreground">
                    <ShieldCheck size={18} className="text-primary" /> Verification record
                  </p>
                  <Field label="Verification method" htmlFor="rp-method">
                    <select id="rp-method" className={selectClass} value={method}
                      onChange={(e) => setMethod(e.target.value as VerificationMethod)}>
                      {(Object.keys(VERIFICATION_METHOD_LABEL) as VerificationMethod[]).map((m) => (
                        <option key={m} value={m}>{VERIFICATION_METHOD_LABEL[m]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Verification notes" htmlFor="rp-notes"
                    error={notes.trim().length >= 5 ? undefined : "Required"}>
                    <Textarea id="rp-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Called the registered number, confirmed DOB and last payment amount…" />
                    <p className="mt-1 text-caption text-muted">
                      Record how identity was verified. This is permanently stored in the audit trail.
                    </p>
                  </Field>
                </div>

                {/* --- 3. Confirm --- */}
                <p className="rounded-lg bg-surface-hover p-3 text-body text-muted">
                  A temporary password will be generated for{" "}
                  <span className="font-medium text-foreground">{account.name}</span> ({account.email}).
                  They will be required to set a new password on their next login.
                </p>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!canSubmit}>Reset password</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
