"use client";

/**
 * Availability control (F4.3, screens 1 and 4).
 *
 * The single most important thing a worker changes during a day, so it lives in
 * the topbar as a tappable pill AND as a full segmented control on Today and
 * Profile. Changing it notifies admin and writes an audit entry — the office
 * needs to know before they assign the next job.
 */
import * as React from "react";
import { Check } from "flowbite-react-icons/outline";
import { toast } from "@/components/ui/sonner";
import { useLive } from "@/lib/stores/live";
import {
  AVAILABILITY_LABEL, WORKER_SETTABLE_AVAILABILITY, setWorkerAvailability,
} from "@/lib/api/worker";
import type { Staff, StaffAvailability } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

/** Palette-only tone per state — no raw colours. */
const toneFor = (a?: StaffAvailability) =>
  a === "available"
    ? "border-primary/40 bg-primary/10 text-primary"
    : a === "busy"
      ? "border-border bg-surface-hover text-foreground"
      : "border-border bg-surface-hover text-muted";

export function AvailabilityPill({ member }: { member: Staff | undefined }) {
  if (!member) return null;
  return (
    <a
      href="/worker/profile"
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-caption font-medium",
        toneFor(member.availability),
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 rounded-full", member.availability === "available" ? "bg-primary" : "bg-muted")} />
      {member.availability ? AVAILABILITY_LABEL[member.availability] : "Set status"}
    </a>
  );
}

export function AvailabilitySegmented({ member }: { member: Staff | undefined }) {
  const bump = useLive((s) => s.bump);
  const [busy, setBusy] = React.useState<StaffAvailability | null>(null);

  const choose = async (next: StaffAvailability) => {
    if (!member || member.availability === next) return;
    setBusy(next);
    try {
      await setWorkerAvailability(member.id, next);
      toast.success(`You're now ${AVAILABILITY_LABEL[next]}`, {
        description: "The office has been notified.",
      });
      bump();
    } catch {
      toast.error("Couldn't update your status");
    } finally {
      setBusy(null);
    }
  };

  if (!member) return null;

  return (
    <div role="group" aria-label="Your availability" className="grid grid-cols-3 gap-2">
      {WORKER_SETTABLE_AVAILABILITY.map((a) => {
        const active = member.availability === a;
        return (
          <button
            key={a}
            type="button"
            onClick={() => choose(a)}
            aria-pressed={active}
            disabled={busy !== null}
            className={cn(
              "flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border px-3 text-body font-medium transition-colors disabled:opacity-60",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface-elevated text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {active && <Check size={16} />}
            {AVAILABILITY_LABEL[a]}
          </button>
        );
      })}
    </div>
  );
}
