"use client";

import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { GlobalPreferences } from "@/components/app/global-preferences";

const notifTypes = [
  { key: "payment", label: "Payments", desc: "Rent, disbursements and receipts" },
  { key: "maintenance", label: "Maintenance", desc: "Requests and status updates" },
  { key: "lease", label: "Leases", desc: "Renewals and expiries" },
  { key: "announcement", label: "Announcements", desc: "Building and community notices" },
  { key: "system", label: "System", desc: "Reports and account activity" },
] as const;

const channels = ["in_app", "email", "sms"] as const;
const channelLabels: Record<(typeof channels)[number], string> = {
  in_app: "In-app",
  email: "Email",
  sms: "SMS",
};

type Prefs = Record<string, Record<(typeof channels)[number], boolean>>;

export default function SettingsPage() {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    const init: Prefs = {};
    notifTypes.forEach((t) => {
      init[t.key] = { in_app: true, email: t.key !== "system", sms: false };
    });
    return init;
  });
  const [saving, setSaving] = React.useState(false);

  const toggle = (type: string, ch: (typeof channels)[number]) =>
    setPrefs((p) => ({ ...p, [type]: { ...p[type], [ch]: !p[type][ch] } }));

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast.success("Preferences saved", { description: "Your notification settings are updated." });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Preferences and notifications" />

      {/* F5.2 — same component, same store, in every portal. */}
      <div className="mb-6">
        <GlobalPreferences />
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated shadow-sm">
        <div className="hidden items-center justify-between border-b border-border p-5 sm:flex">
          <span className="text-caption uppercase tracking-wide text-muted">Notification</span>
          <div className="flex gap-6">
            {channels.map((c) => (
              <span key={c} className="w-12 text-center text-caption uppercase tracking-wide text-muted">
                {channelLabels[c]}
              </span>
            ))}
          </div>
        </div>

        {notifTypes.map((t) => (
          <div
            key={t.key}
            className="flex flex-col gap-4 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{t.label}</p>
              <p className="text-caption text-muted">{t.desc}</p>
            </div>
            <div className="flex gap-6">
              {channels.map((c) => (
                <div key={c} className="flex w-12 flex-col items-center gap-1">
                  <span className="text-caption text-muted sm:hidden">{channelLabels[c]}</span>
                  <Switch
                    checked={prefs[t.key][c]}
                    onCheckedChange={() => toggle(t.key, c)}
                    aria-label={`${t.label} — ${channelLabels[c]}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={save} loading={saving}>
          Save preferences
        </Button>
      </div>
    </div>
  );
}
