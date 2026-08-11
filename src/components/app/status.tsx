import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Palette-only status system (no green/red — six tokens). Problems draw the eye
 * in brand primary; healthy states read as a neutral chip; in-between states are
 * muted. One helper for every entity status so the tables stay consistent.
 */
type Tone = "good" | "warn" | "bad" | "neutral";

const toneClass: Record<Tone, string> = {
  good: "border-transparent bg-surface-active text-foreground",
  warn: "border-transparent bg-surface-hover text-muted",
  bad: "border-primary/30 bg-primary/10 text-primary",
  neutral: "border-border text-foreground",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // properties / units
  managed: { label: "Managed", tone: "good" },
  onboarding: { label: "Onboarding", tone: "warn" },
  prospect: { label: "Prospect", tone: "neutral" },
  occupied: { label: "Occupied", tone: "good" },
  vacant: { label: "Vacant", tone: "neutral" },
  notice: { label: "On notice", tone: "warn" },
  maintenance: { label: "Maintenance", tone: "warn" },
  // leases
  active: { label: "Active", tone: "good" },
  expiring: { label: "Expiring", tone: "bad" },
  expired: { label: "Expired", tone: "bad" },
  terminated: { label: "Terminated", tone: "bad" },
  pending: { label: "Pending", tone: "warn" },
  // invoices / payments
  paid: { label: "Paid", tone: "good" },
  overdue: { label: "Overdue", tone: "bad" },
  partial: { label: "Partial", tone: "warn" },
  completed: { label: "Completed", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  // tickets
  open: { label: "Open", tone: "warn" },
  assigned: { label: "Assigned", tone: "neutral" },
  in_progress: { label: "In progress", tone: "neutral" },
  closed: { label: "Closed", tone: "good" },
  // tenants
  past: { label: "Past", tone: "warn" },
  // leads
  new: { label: "New", tone: "bad" },
  contacted: { label: "Contacted", tone: "warn" },
  qualified: { label: "Qualified", tone: "neutral" },
  proposal: { label: "Proposal", tone: "neutral" },
  won: { label: "Won", tone: "good" },
  lost: { label: "Lost", tone: "neutral" },
  // bookings (short-term stays)
  confirmed: { label: "Confirmed", tone: "good" },
  checked_in: { label: "Checked-in", tone: "neutral" },
  checked_out: { label: "Checked-out", tone: "good" },
  cancelled: { label: "Cancelled", tone: "bad" },
  // rental inquiries (long-term) — mapped from lead stages
  quoted: { label: "Quoted", tone: "neutral" },
  converted: { label: "Converted", tone: "good" },
  // agreements
  draft: { label: "Draft", tone: "warn" },
  // expenses / staff
  approved: { label: "Approved", tone: "good" },
  reimbursed: { label: "Reimbursed", tone: "good" },
  invited: { label: "Invited", tone: "warn" },
  suspended: { label: "Suspended", tone: "bad" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge className={cn(toneClass[s.tone], className)}>{s.label}</Badge>;
}

const PRIORITY: Record<string, Tone> = { low: "neutral", medium: "warn", high: "warn", urgent: "bad" };

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const tone = PRIORITY[priority] ?? "neutral";
  return (
    <Badge className={cn(toneClass[tone], "capitalize", className)}>{priority}</Badge>
  );
}
