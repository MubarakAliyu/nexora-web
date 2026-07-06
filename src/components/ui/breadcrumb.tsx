import Link from "next/link";
import { ChevronRight } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-caption">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="text-muted transition-colors hover:text-primary"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={cn(last ? "font-medium text-foreground" : "text-muted")}
                  aria-current={last ? "page" : undefined}
                >
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight size={14} className="text-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
