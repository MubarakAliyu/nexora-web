"use client";

/**
 * Grant / revoke worker portal access (F4.1).
 *
 * E2 deliberately created operational staff without logins. Granting one is an
 * explicit, per-person act by an admin — not something that happens implicitly
 * when a staff record is created — so it lives behind its own dialog with its
 * own confirmation.
 */
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockOpen, ExclamationCircle } from "flowbite-react-icons/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";
import { grantPortalAccess, revokePortalAccess, WORKER_TYPE_LABEL } from "@/lib/api/worker";
import type { Staff, WorkerType } from "@/lib/mock/types";

const schema = z.object({
  email: z.string().email("Enter a valid work email"),
  workerType: z.enum(["employee", "contractor"]),
});
type Values = z.infer<typeof schema>;

/** Suggests firstname.worker@nexora.co.ug, matching the seeded convention. */
const suggestEmail = (name: string) =>
  `${name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.worker@nexora.co.ug`;

export function GrantPortalAccessDialog({ member, onOpenChange, onDone }: {
  member: Staff | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const actor = useSession((s) => s.user?.name ?? "Admin");
  const [issued, setIssued] = React.useState<{ email: string; tempPassword: string } | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", workerType: "employee" },
  });

  React.useEffect(() => {
    if (member) {
      setIssued(null);
      form.reset({ email: member.email ?? suggestEmail(member.name), workerType: member.workerType ?? "employee" });
    }
  }, [member, form]);

  const submit = form.handleSubmit(async (v) => {
    if (!member) return;
    try {
      const res = await grantPortalAccess(member.id, { email: v.email, workerType: v.workerType, actor });
      setIssued({ email: res.email, tempPassword: res.tempPassword });
      toast.success("Portal access granted", { description: `${member.name} can now sign in.` });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't grant access");
    }
  });

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        {member && !issued && (
          <>
            <DialogHeader>
              <DialogTitle>Grant portal access</DialogTitle>
              <DialogDescription>
                {member.name} · {member.jobTitle ?? "Operational staff"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Work email" htmlFor="gp-email" error={form.formState.errors.email?.message}>
                <Input id="gp-email" type="email" {...form.register("email")} />
                <p className="mt-1 text-caption text-muted">
                  They sign in with this. Many field workers have no email on record — capture one now.
                </p>
              </Field>
              <Field label="Worker type" htmlFor="gp-type" error={form.formState.errors.workerType?.message}>
                <select id="gp-type" className={selectClass} {...form.register("workerType")}>
                  {(["employee", "contractor"] as WorkerType[]).map((t) => (
                    <option key={t} value={t}>{WORKER_TYPE_LABEL[t]}</option>
                  ))}
                </select>
                <p className="mt-1 text-caption text-muted">
                  Contractors can request payouts; employees are on payroll.
                </p>
              </Field>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                <Button type="submit" loading={form.formState.isSubmitting}>
                  <LockOpen size={16} /> Grant access
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {member && issued && (
          <>
            <DialogHeader>
              <DialogTitle>Access granted</DialogTitle>
              <DialogDescription>Pass these to {member.name} directly.</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-foreground">{issued.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Temporary password</dt>
                <dd className="font-mono font-medium text-foreground">{issued.tempPassword}</dd>
              </div>
            </dl>
            <p className="text-caption text-muted">
              They must set their own password on first sign-in.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RevokePortalAccessDialog({ member, onOpenChange, onDone }: {
  member: Staff | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const actor = useSession((s) => s.user?.name ?? "Admin");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    try {
      await revokePortalAccess(member.id, actor);
      toast.success("Portal access revoked", { description: `${member.name}'s staff record is unchanged.` });
      onOpenChange(false); onDone();
    } catch {
      toast.error("Couldn't revoke access");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        {member && (
          <>
            <DialogHeader>
              <DialogTitle>Revoke portal access?</DialogTitle>
              <DialogDescription>{member.name} · {member.email}</DialogDescription>
            </DialogHeader>
            <p className="inline-flex items-start gap-2 rounded-xl border border-border bg-surface-hover p-3 text-body text-muted">
              <ExclamationCircle size={18} className="mt-0.5 shrink-0 text-primary" />
              They will no longer be able to sign in. Their staff record, job history and
              current assignments are <span className="font-medium text-foreground">kept</span> —
              only the login is removed.
            </p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button loading={busy} onClick={submit}>Revoke access</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
