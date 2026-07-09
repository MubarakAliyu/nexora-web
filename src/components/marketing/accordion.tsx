"use client";

import * as React from "react";
import { AngleDown } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";

/** Click-to-expand accordion item — content reveals with a fade/slide entrance;
 *  chevron rotates. Reduced-motion safe (motion-safe: prefixes). */
export function AccordionItem({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span>
          <span className="block font-heading text-h3 font-medium text-foreground">
            {title}
          </span>
          {subtitle && <span className="mt-1 block text-caption text-muted">{subtitle}</span>}
        </span>
        <AngleDown
          size={22}
          className={cn(
            "shrink-0 text-primary transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="overflow-hidden pb-6 text-body leading-relaxed text-muted motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("border-t border-border", className)}>{children}</div>;
}
