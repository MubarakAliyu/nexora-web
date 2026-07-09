import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
