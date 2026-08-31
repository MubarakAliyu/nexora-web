"use client";

/**
 * Global Preferences (F5.2).
 *
 * ONE component, mounted in all four portals' Settings areas, reading and
 * writing the ONE preferences store. Admin, owner, tenant and worker get the
 * same currency control and the same wording — a preference that means
 * something different depending on which portal you set it from would be worse
 * than no preference at all.
 *
 * The `extra` slot is for the portal-specific rows that sit alongside it
 * (owner approval notices, worker availability defaults).
 */
import * as React from "react";
import { InfoCircle } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Field, selectClass } from "@/components/forms/field";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { toast } from "@/components/ui/sonner";
import { usePreferences } from "@/lib/stores/preferences";
import { recordMutation } from "@/lib/api/actions";
import { currencyLabel } from "@/lib/format";
import type { Currency } from "@/lib/mock/types";

const CURRENCIES: Currency[] = ["UGX", "USD"];

export function GlobalPreferences({
  title = "Preferences",
  description = "These apply to you across Nexora.",
  children,
}: {
  title?: string;
  description?: string;
  /** Portal-specific preference rows rendered under the shared ones. */
  children?: React.ReactNode;
}) {
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);

  const change = (next: Currency) => {
    if (next === currency) return;
    const before = currency;
    setCurrency(next);
    recordMutation({
      entityType: "settings", entityId: "currency", entityName: "Default currency",
      action: "updated",
      summary: `Default currency changed from ${before} to ${next}`,
      before: { currency: before }, after: { currency: next },
      notify: {
        type: "system", title: "Currency preference updated",
        body: `New records will be created in ${next}. Existing records keep the currency they were recorded in.`,
        audiences: ["admin"],
      },
    });
    toast.success(`Default currency is now ${next}`, {
      description: "Existing records keep the currency they were recorded in.",
    });
  };

  return (
    <Card className="max-w-2xl p-6">
      <div className="mb-4">
        <h3 className="font-heading text-h3 font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-caption text-muted">{description}</p>
      </div>

      <div className="space-y-5">
        <Field label="Default currency" htmlFor="pref-currency">
          <select
            id="pref-currency"
            className={selectClass}
            value={currency}
            onChange={(e) => change(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{currencyLabel(c)}</option>
            ))}
          </select>
          {/* The minutes ruled out assuming exchange-rate behaviour, so this has
              to be stated plainly rather than left for someone to discover. */}
          <p className="mt-2 inline-flex items-start gap-2 rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
            <InfoCircle size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              Amounts are displayed in the currency in which they were recorded.
              Automatic conversion is not enabled. Changing this affects new records
              and your own totals only.
            </span>
          </p>
        </Field>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-body font-medium text-foreground">Appearance</p>
            <p className="text-caption text-muted">Toggle light or dark mode.</p>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {children}
      </div>
    </Card>
  );
}

/** Shared notification-preference rows — same three toggles in every portal. */
export function NotificationPreferences({ scope }: { scope: string }) {
  const [prefs, setPrefs] = React.useState({ email: true, inApp: true, sms: false });
  const toggle = (k: keyof typeof prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    recordMutation({
      entityType: "settings", entityId: `notifications_${scope}`, entityName: "Notification preferences",
      action: "updated",
      summary: `${scope} notification preference "${k}" turned ${next[k] ? "on" : "off"}`,
      before: prefs, after: next,
      notify: false,
    });
    toast.success("Notification preferences saved");
  };
  return (
    <div className="border-t border-border pt-5">
      <p className="mb-3 text-body font-medium text-foreground">Notifications</p>
      <div className="space-y-3">
        {([["inApp", "In-app"], ["email", "Email"], ["sms", "SMS"]] as const).map(([k, label]) => (
          <label key={k} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
            <span className="text-body text-foreground">{label}</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={prefs[k]}
              onChange={() => toggle(k)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
