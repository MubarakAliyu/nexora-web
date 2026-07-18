"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, DesktopPc, MobilePhone } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { saveSettingsSection } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score] };
}

const pwSchema = z.object({
  current: z.string().min(1, "Enter your current password"),
  next: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: "Passwords don’t match", path: ["confirm"] });
type PwValues = z.infer<typeof pwSchema>;

interface Session { id: string; device: string; browser: string; location: string; lastActive: string; current: boolean; mobile: boolean }
const INITIAL_SESSIONS: Session[] = [
  { id: "s1", device: "Windows 11 · Desktop", browser: "Chrome 128", location: "Kampala, UG", lastActive: "Active now", current: true, mobile: false },
  { id: "s2", device: "iPhone 15", browser: "Safari", location: "Kampala, UG", lastActive: "2 hours ago", current: false, mobile: true },
  { id: "s3", device: "MacBook Pro", browser: "Firefox 129", location: "Entebbe, UG", lastActive: "Yesterday", current: false, mobile: false },
];

export function SecurityTab() {
  const [twoFA, setTwoFA] = React.useState(true);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<Session[]>(INITIAL_SESSIONS);
  const [revoking, setRevoking] = React.useState<Session | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<PwValues>({
    resolver: zodResolver(pwSchema), defaultValues: { current: "", next: "", confirm: "" },
  });
  const pw = watch("next") ?? "";
  const st = strengthOf(pw);

  const onChangePw = async () => {
    await saveSettingsSection("security", "Changed account password");
    toast.success("Password changed successfully");
    reset();
  };

  const confirmDisable = async () => {
    setTwoFA(false); setDisableOpen(false);
    await saveSettingsSection("security", "Disabled organization 2FA");
    toast.success("Two-factor disabled");
  };
  const onToggle2FA = async (v: boolean) => {
    if (!v) { setDisableOpen(true); return; }
    setTwoFA(true);
    await saveSettingsSection("security", "Enabled organization 2FA");
    toast.success("Two-factor enabled");
  };

  const revoke = async () => {
    if (!revoking) return;
    setSessions((prev) => prev.filter((s) => s.id !== revoking.id));
    await saveSettingsSection("security", `Revoked session (${revoking.device})`);
    toast.success("Session revoked", { description: revoking.device });
    setRevoking(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-primary"><ShieldCheck size={22} /></span>
            <div>
              <h3 className="font-heading text-h3 font-semibold text-foreground">Two-factor authentication</h3>
              <p className="mt-1 text-body text-muted">Require a 6-digit code on sign-in for all users in the organization.</p>
            </div>
          </div>
          <Switch checked={twoFA} onCheckedChange={onToggle2FA} aria-label="Toggle two-factor authentication" />
        </div>
      </Card>

      <Card className="max-w-xl p-6">
        <h3 className="font-heading text-h3 font-semibold text-foreground">Change password</h3>
        <form onSubmit={handleSubmit(onChangePw)} noValidate className="mt-4 space-y-4">
          <Field label="Current password" htmlFor="sc-cur" error={errors.current?.message}><Input id="sc-cur" type="password" autoComplete="current-password" {...register("current")} aria-invalid={!!errors.current} /></Field>
          <Field label="New password" htmlFor="sc-next" error={errors.next?.message}><Input id="sc-next" type="password" autoComplete="new-password" {...register("next")} aria-invalid={!!errors.next} /></Field>
          {pw.length > 0 && (
            <div aria-live="polite">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < st.score ? "bg-primary" : "bg-border")} />)}
              </div>
              <p className="mt-1.5 text-caption text-muted">Strength: <span className="font-medium text-foreground">{st.label}</span></p>
            </div>
          )}
          <Field label="Confirm new password" htmlFor="sc-conf" error={errors.confirm?.message}><Input id="sc-conf" type="password" autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} /></Field>
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-heading text-h3 font-semibold text-foreground">Active sessions</h3>
        <div className="mt-4 divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-muted">{s.mobile ? <MobilePhone size={20} /> : <DesktopPc size={20} />}</span>
                <div>
                  <p className="flex items-center gap-2 text-body font-medium text-foreground">{s.device} {s.current && <Badge variant="secondary">This device</Badge>}</p>
                  <p className="text-caption text-muted">{s.browser} · {s.location} · {s.lastActive}</p>
                </div>
              </div>
              {!s.current && <Button variant="outline" size="sm" onClick={() => setRevoking(s)}>Revoke</Button>}
            </div>
          ))}
          {sessions.length === 0 && <p className="py-6 text-center text-body text-muted">No other active sessions.</p>}
        </div>
      </Card>

      {/* Disable 2FA confirmation */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication?</DialogTitle>
            <DialogDescription>Are you sure? This reduces account security for all users in the organization.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={confirmDisable}>Disable 2FA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke session?</DialogTitle>
            <DialogDescription>{revoking?.device} will be signed out immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={revoke}>Revoke session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
