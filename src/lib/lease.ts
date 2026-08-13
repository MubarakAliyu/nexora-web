/**
 * Derived lease-status logic (Revision C). The STORED status is never mutated
 * for time-based transitions — instead the display is computed from the end
 * date so an active lease surfaces as "Expiring Soon" within 30 days and
 * "Expired" once past, without a manual status change. Renewal/terminated
 * statuses are explicit and pass through unchanged.
 */
import type { Lease, LeaseStatus, DepositStatus } from "@/lib/mock/types";

const DAY = 86_400_000;

export interface LeaseView {
  /** The status to DISPLAY (may differ from lease.status for time transitions). */
  status: LeaseStatus;
  /** Whole days until expiry (negative once expired). */
  daysToExpiry: number;
  /** Active lease inside the 30-day window. */
  expiringSoon: boolean;
  /** Active lease past its end date. */
  expired: boolean;
  /** Inside 14 days — warrants the pulsing attention indicator. */
  urgent: boolean;
  /** Fraction of the lease term elapsed (0–1), for progress bars. */
  progress: number;
}

export function leaseView(lease: Lease, nowIso: string): LeaseView {
  const now = new Date(nowIso).getTime();
  const end = new Date(lease.end).getTime();
  const start = new Date(lease.start).getTime();
  const daysToExpiry = Math.ceil((end - now) / DAY);

  // Time-based transitions only apply to leases that are otherwise "live".
  const timeDriven = lease.status === "active" || lease.status === "expiring";
  const expired = timeDriven && daysToExpiry < 0;
  const expiringSoon = timeDriven && daysToExpiry >= 0 && daysToExpiry <= 30;

  let status: LeaseStatus = lease.status;
  if (expired) status = "expired";
  else if (expiringSoon) status = "expiring_soon";
  else if (timeDriven) status = "active";

  const span = end - start;
  const progress = span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 1;

  return {
    status,
    daysToExpiry,
    expiringSoon,
    expired,
    urgent: expiringSoon && daysToExpiry <= 14,
    progress,
  };
}

/** Human deposit-status label + one-line detail from the settlement fields. */
export function depositSummary(lease: Lease, fmt: (n: number) => string): {
  status: DepositStatus;
  label: string;
  detail: string;
} {
  const status: DepositStatus = lease.depositStatus ?? "held";
  const settled = lease.depositSettledAt
    ? new Date(lease.depositSettledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  switch (status) {
    case "refunded":
      return { status, label: "Refunded", detail: `${fmt(lease.depositRefundAmount ?? lease.deposit)} returned to tenant${settled ? ` on ${settled}` : ""}` };
    case "partially_refunded":
      return {
        status,
        label: "Partially Refunded",
        detail: `${fmt(lease.depositRefundAmount ?? 0)} returned, ${fmt(lease.depositDeductionAmount ?? 0)} retained${lease.depositReason ? ` (${lease.depositReason})` : ""}`,
      };
    case "deducted":
      return { status, label: "Deducted", detail: `${fmt(lease.depositDeductionAmount ?? lease.deposit)} applied${lease.depositReason ? ` to ${lease.depositReason}` : ""}${lease.depositAdditionalOwed ? ` · ${fmt(lease.depositAdditionalOwed)} additional owed` : ""}` };
    case "forfeited":
      return { status, label: "Forfeited", detail: `${fmt(lease.deposit)} retained${lease.depositReason ? ` (${lease.depositReason})` : ""}` };
    default:
      return { status: "held", label: "Held", detail: `${fmt(lease.deposit)} held by Nexora` };
  }
}
