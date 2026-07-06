import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Timeline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ol className={cn("relative ml-2 border-l border-border", className)}>
      {children}
    </ol>
  );
}

interface TimelineItemProps {
  title: string;
  time?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function TimelineItem({
  title,
  time,
  icon,
  children,
  className,
}: TimelineItemProps) {
  return (
    <li className={cn("relative pb-8 pl-6 last:pb-0", className)}>
      <span className="absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground ring-1 ring-border">
        {icon}
      </span>
      <div className="flex flex-wrap items-center gap-x-2">
        <h4 className="font-heading text-body font-semibold text-foreground">{title}</h4>
        {time && <span className="text-caption text-muted">{time}</span>}
      </div>
      {children && <div className="mt-1 text-body text-muted">{children}</div>}
    </li>
  );
}
