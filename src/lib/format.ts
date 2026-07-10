/** Shared formatting helpers for the dashboard (UGX currency, dates, etc.). */

/** Compact UGX, e.g. 2,800,000 → "UGX 2.8M". */
export function formatUGX(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact ?? true) {
    if (Math.abs(n) >= 1_000_000_000) return `UGX ${(n / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (Math.abs(n) >= 1_000) return `UGX ${(n / 1_000).toFixed(0)}K`;
  }
  return `UGX ${n.toLocaleString("en-UG")}`;
}

/** Full UGX with thousands separators, e.g. "UGX 2,800,000". */
export function formatUGXFull(n: number): string {
  return `UGX ${Math.round(n).toLocaleString("en-UG")}`;
}

/** "10 Jul 2026". Stable formatting (en-GB) to avoid locale drift. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "10 Jul" — short form for dense tables. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Relative-ish label anchored to the fixed mock "now". */
export function fromNow(iso: string, nowIso: string): string {
  const diff = new Date(nowIso).getTime() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.round(diff / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}
