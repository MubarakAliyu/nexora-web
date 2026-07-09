import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";

/** Protected dashboard layout — AppShell guards auth (redirects to /login) and
 *  provides the role-aware sidebar, topbar, breadcrumb and content area. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
