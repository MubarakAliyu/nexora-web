import type { ReactNode } from "react";

/**
 * (app) route group — authenticated Admin / Owner / Tenant dashboards.
 * The role-aware app shell (sidebar, topbar) is built in Batch 8. Placeholder for now.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
