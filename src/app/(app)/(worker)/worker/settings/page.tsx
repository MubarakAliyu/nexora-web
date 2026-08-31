"use client";

/**
 * WORKER SETTINGS (F5.2).
 *
 * The fourth portal's Settings area. Same preferences component and same store
 * as admin, owner and tenant — but laid out the way the rest of the worker
 * portal is: one column, big targets, no tabs. A field worker opening Settings
 * on a phone should see four things, not seven tabs.
 */
import * as React from "react";
import Link from "next/link";
import { AngleLeft } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { GlobalPreferences, NotificationPreferences } from "@/components/app/global-preferences";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import {
  staffForUser, WORKER_SETTABLE_AVAILABILITY, AVAILABILITY_LABEL, setWorkerAvailability,
} from "@/lib/api/worker";
import type { StaffAvailability } from "@/lib/mock/types";

export default function WorkerSettingsPage() {
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );

  const [busy, setBusy] = React.useState(false);

  if (!mounted || !member) {
    return <div className="space-y-3"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></div>;
  }

  /* "Availability default" is the status you return to — the office reads it
     when deciding who to send, so changing it notifies them like any other
     availability change. */
  const setDefault = async (next: StaffAvailability) => {
    setBusy(true);
    try {
      await setWorkerAvailability(member.id, next);
      toast.success(`Default status set to ${AVAILABILITY_LABEL[next]}`, {
        description: "The office has been notified.",
      });
      bump();
    } catch {
      toast.error("Couldn't save your default status");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/worker/profile" className="inline-flex min-h-[44px] items-center gap-1 text-body font-medium text-primary">
        <AngleLeft size={18} /> Profile
      </Link>

      <h1 className="font-heading text-h1 font-semibold text-foreground">Settings</h1>

      <GlobalPreferences description="These apply to you across Nexora.">
        <NotificationPreferences scope="worker" />

        <div className="border-t border-border pt-5">
          <Field label="Availability default" htmlFor="wk-default">
            <select
              id="wk-default"
              className={selectClass}
              value={member.availability ?? "available"}
              disabled={busy}
              onChange={(e) => setDefault(e.target.value as StaffAvailability)}
            >
              {WORKER_SETTABLE_AVAILABILITY.map((a) => (
                <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>
              ))}
            </select>
            <p className="mt-1 text-caption text-muted">
              The status the office sees when you haven&rsquo;t changed it today.
              Set your weekly hours on your profile.
            </p>
          </Field>
        </div>
      </GlobalPreferences>

      <Card className="p-5">
        <p className="text-body font-medium text-foreground">Weekly availability</p>
        <p className="mt-0.5 text-caption text-muted">
          Day-by-day hours live on your profile, next to your contact details.
        </p>
        <Button asChild variant="outline" className="mt-3 min-h-[48px]">
          <Link href="/worker/profile">Open profile</Link>
        </Button>
      </Card>
    </div>
  );
}
