"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/content/site";

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}

/**
 * Right-drawer mobile menu built on the Sheet (Radix Dialog) — inherits focus
 * trap, body-scroll lock, escape + outside-click close. Links stagger in.
 */
export function MobileMenu({ open, onOpenChange, pathname }: MobileMenuProps) {
  const reduce = useReducedMotion();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetTitle className="sr-only">Menu</SheetTitle>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
          {primaryNav.map((item, i) => {
            const active = isActive(item.href, pathname);
            const link = (
              <Link
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2.5 font-heading text-h3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            );

            return reduce ? (
              <div key={item.href}>{link}</div>
            ) : (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                {link}
              </motion.div>
            );
          })}
        </nav>

        <div className="mt-8 flex flex-col gap-3 px-3">
          <Button asChild className="w-full">
            <Link href="/request-a-quote" onClick={() => onOpenChange(false)}>
              Request a Quote
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login" onClick={() => onOpenChange(false)}>
              Log in
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
