import type { ReactNode } from "react";
import { MarketingFrame } from "@/components/marketing/marketing-frame";

/**
 * (marketing) route group — composes the shared chrome (header, footer,
 * floating WhatsApp) around every public page via <MarketingFrame>.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingFrame>{children}</MarketingFrame>;
}
