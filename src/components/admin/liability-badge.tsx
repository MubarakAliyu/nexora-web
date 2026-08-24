import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketLiability } from "@/lib/mock/types";

/**
 * Who bears a maintenance cost. Palette-only (no raw red/green/blue): the tenant
 * case draws the eye because it's the one that raises an invoice someone must chase.
 */
const STYLES: Record<TicketLiability, { label: string; cls: string }> = {
  owner: { label: "Owner", cls: "border-transparent bg-surface-active text-foreground" },
  tenant: { label: "Tenant", cls: "border-primary/30 bg-primary/10 text-primary" },
  nexora: { label: "Nexora", cls: "border-transparent bg-surface-hover text-muted" },
};

export function LiabilityBadge({ liability, className }: { liability?: TicketLiability | null; className?: string }) {
  if (!liability) return <span className="text-caption text-muted">—</span>;
  const s = STYLES[liability];
  return <Badge className={cn(s.cls, className)}>{s.label}</Badge>;
}
