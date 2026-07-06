"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pageHasHero } from "@/content/site";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { WhatsAppButton } from "./whatsapp-button";

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
    <div className="flex min-h-screen flex-col">
      <SiteHeader hasHero={hasHero} />
      <main className={cn("flex-1", !hasHero && "pt-20")}>{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
