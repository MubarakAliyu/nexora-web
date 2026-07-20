import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RentalType } from "@/lib/mock/types";

/** Consistent Short-Term / Long-Term chip used across admin, owner and marketing. */
export function RentalTypeBadge({ type, className }: { type?: RentalType; className?: string }) {
  if (!type) return null;
  const short = type === "short-term";
  return (
    <Badge
      className={cn(
        short ? "border-transparent bg-primary text-primary-foreground" : "border-transparent bg-surface-active text-foreground",
        className,
      )}
    >
      {short ? "Short-Term" : "Long-Term"}
    </Badge>
  );
}
