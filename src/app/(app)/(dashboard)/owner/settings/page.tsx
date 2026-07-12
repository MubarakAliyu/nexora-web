"use client";

import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { selectClass } from "@/components/forms/field";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

interface Toggle { id: string; label: string; desc: string }

const NOTIFY: Toggle[] = [
  { id: "report", label: "Report ready", desc: "When a new monthly or quarterly statement is available." },
  { id: "disbursement", label: "Disbursement processed", desc: "When your net payout has been sent." },
  { id: "lease", label: "Lease alerts", desc: "Renewals and expiries on your properties." },
  { id: "maintenance", label: "Maintenance updates", desc: "Significant maintenance on your properties." },
];
const CHANNELS: Toggle[] = [
  { id: "email", label: "Email", desc: "Send notifications to your email address." },
  { id: "sms", label: "SMS", desc: "Text important alerts to your phone." },
  { id: "in_app", label: "In-app", desc: "Show notifications in the portal bell." },
];

export default function OwnerSettingsPage() {
  const [state, setState] = React.useState<Record<string, boolean>>({
    report: true, disbursement: true, lease: true, maintenance: false,
    email: true, sms: false, in_app: true,
  });
  const [currency, setCurrency] = React.useState("UGX");
  const set = (id: string, v: boolean) => setState((s) => ({ ...s, [id]: v }));

  const save = async () => {
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Preferences saved", { description: "Your settings have been updated." });
  };

  const Row = ({ t }: { t: Toggle }) => (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <Label htmlFor={`sw-${t.id}`} className="text-body font-medium text-foreground">{t.label}</Label>
        <p className="text-caption text-muted">{t.desc}</p>
      </div>
      <Switch id={`sw-${t.id}`} checked={state[t.id]} onCheckedChange={(v) => set(t.id, v)} aria-label={t.label} />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Notification and display preferences" />

      <Card className="p-6">
        <h2 className="font-heading text-h3 font-semibold text-foreground">Notify me about</h2>
        <div className="mt-2 divide-y divide-border">
          {NOTIFY.map((t) => <Row key={t.id} t={t} />)}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-heading text-h3 font-semibold text-foreground">Delivery channels</h2>
        <div className="mt-2 divide-y divide-border">
          {CHANNELS.map((t) => <Row key={t.id} t={t} />)}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-heading text-h3 font-semibold text-foreground">Display</h2>
        <div className="mt-4 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-body font-medium text-foreground">Appearance</p>
            <p className="text-caption text-muted">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle variant="icon" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cur" className="mb-1.5 block text-body font-medium text-foreground">Currency</Label>
            <select id="cur" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>Save preferences</Button>
      </div>
    </div>
  );
}
