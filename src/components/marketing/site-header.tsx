"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bars } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { primaryNav, site } from "@/content/site";
import { MobileMenu } from "./mobile-menu";

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Sticky marketing header. Over a hero it is transparent with the white logo
 * and light text; once scrolled past the threshold (or on non-hero pages) it
 * transitions to a solid --background surface with the primary dark logo.
 */
export function SiteHeader({ hasHero }: { hasHero: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Solid surface when the page has no hero, or once the user scrolls past the hero band.
  const solid = !hasHero || scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
        solid
          ? "border-border bg-background shadow-sm"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
        {/* Logo — crossfade between white (over hero) and primary (solid) */}
        <Link
          href="/"
          aria-label={site.name}
          className="relative block h-9 w-[170px] shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <Image
            src="/brand/logo-white.svg"
            alt=""
            fill
            priority
            sizes="170px"
            className={cn(
              "object-contain object-left transition-opacity duration-300",
              solid ? "opacity-0" : "opacity-100",
            )}
          />
          <Image
            src="/brand/logo-primary.svg"
            alt={site.name}
            fill
            priority
            sizes="170px"
            className={cn(
              "object-contain object-left transition-opacity duration-300",
              solid ? "opacity-100" : "opacity-0",
            )}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  active
                    ? "text-primary"
                    : solid
                      ? "text-foreground hover:text-primary"
                      : "text-background/90 hover:text-background",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <Button asChild size="sm">
              <Link href="/contact">Request a Quote</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:hidden",
              solid ? "text-foreground hover:bg-surface-hover" : "text-background",
            )}
          >
            <Bars size={26} />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} pathname={pathname} />
    </header>
  );
}
