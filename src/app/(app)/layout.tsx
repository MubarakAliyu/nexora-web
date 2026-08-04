import type { ReactNode } from "react";
import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/** Keep the authenticated app out of search indexes (robots.txt also disallows). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * (app) route group root — authenticated application (auth screens + dashboards).
 * Provides tooltip context and the toast host; the marketing chrome is NOT used here.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
