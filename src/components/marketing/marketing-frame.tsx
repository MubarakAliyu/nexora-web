"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pageHasHero } from "@/content/site";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { WhatsAppButton } from "./whatsapp-button";
import { Toaster } from "@/components/ui/sonner";

/**
 * Marketing chrome wrapper. Reads the pathname (SSR-stable, no flash) to decide
 * whether the current page opens with a full-bleed hero:
 *  - hero page  → transparent header overlaying the hero, no top padding.
 *  - other page → solid header from the top, main padded by the header height.
 */
export function MarketingFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasHero = pageHasHero(pathname);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-body focus:font-medium focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <SiteHeader hasHero={hasHero} />
      <main id="main-content" className={cn("flex-1", !hasHero && "pt-20")}>{children}</main>
      <SiteFooter />
      <WhatsAppButton />
      <Toaster />
    </div>
  );
}
