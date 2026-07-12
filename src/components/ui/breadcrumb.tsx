import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb shown on every viewport. On small screens the middle segments
 * collapse to an ellipsis (first › … › last) and the final label truncates, so
 * a deep path never forces horizontal page scroll.
 */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-nowrap items-center gap-1.5 text-xs sm:text-caption">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          const first = i === 0;
          const isMiddle = !first && !last;
          return (
            <React.Fragment key={`${c.label}-${i}`}>
              {/* Collapsed-middle placeholder (mobile only, when there are middle segments) */}
              {isMiddle && i === 1 && items.length > 2 && (
                <li className="flex items-center gap-1.5 sm:hidden">
                  <span className="text-muted">…</span>
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                </li>
              )}
              <li className={cn("flex items-center gap-1.5", isMiddle && "hidden sm:flex", last && "min-w-0")}>
                {c.href && !last ? (
                  <Link href={c.href} className="whitespace-nowrap text-muted transition-colors hover:text-primary">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={cn("truncate", last ? "font-medium text-foreground" : "whitespace-nowrap text-muted")}
                    aria-current={last ? "page" : undefined}
                  >
                    {c.label}
                  </span>
                )}
                {!last && <ChevronRight size={14} className="shrink-0 text-muted" />}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
