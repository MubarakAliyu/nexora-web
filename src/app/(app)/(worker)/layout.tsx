import type { ReactNode } from "react";
import { WorkerShell } from "@/components/worker/worker-shell";

/**
 * Worker portal layout (F4.2). Its own route group rather than a branch inside
 * (dashboard): the worker portal shares no chrome with the admin/owner/tenant
 * shell — no sidebar-by-default, no breadcrumbs, no global search — and mixing
 * the two would mean carrying admin structure it never uses.
 */
export default function WorkerLayout({ children }: { children: ReactNode }) {
  return <WorkerShell>{children}</WorkerShell>;
}
