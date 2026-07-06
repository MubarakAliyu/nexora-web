import type { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { value: string; direction: "up" | "down" };
  hint?: string;
  className?: string;
}

/** KPI tile: label, large value (accepts a <CountUp>), optional icon + trend. */
export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-caption uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-heading text-h1 font-semibold text-foreground">
            {value}
          </p>
        </div>
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
            {icon}
          </span>
        )}
      </div>
      {(trend || hint) && (
        <div className="mt-4 flex items-center gap-2 text-caption">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                trend.direction === "up" ? "text-primary" : "text-accent",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
