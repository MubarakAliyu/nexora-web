"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { StaffAvailability } from "@/lib/mock/types";

const STYLES: Record<StaffAvailability, { label: string; dot: string; text: string }> = {
  available: { label: "Available", dot: "bg-primary", text: "text-primary" },
  busy: { label: "Busy", dot: "bg-accent", text: "text-accent" },
  off: { label: "Off", dot: "bg-muted", text: "text-muted" },
};

/**
 * Availability chip. When `onClick` is passed it renders as a button that
 * cycles the state (available → busy → off); otherwise it's a static label.
 */
export function AvailabilityBadge({
  value,
  onClick,
}: {
  value: StaffAvailability;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const s = STYLES[value] ?? STYLES.available;
  const content = (
    <>
      <span className={cn("h-2 w-2 rounded-full", s.dot)} />
      {s.label}
    </>
  );
  const base = "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption font-medium";
  if (!onClick) return <span className={cn(base, s.text)}>{content}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, s.text, "transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary")}
      aria-label={`Availability: ${s.label}. Click to change.`}
    >
      {content}
    </button>
  );
}
