import type { ReactNode } from "react";
import { PageHeader } from "./page-header";
import { StatCard } from "@/components/ui/stat-card";

interface Stat {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" };
}

/** Placeholder dashboard home shown until the full portal screens land
 *  (Admin = Batch 9, Owner = Batch 10, Tenant = Batch 11). Confirms the shell,
 *  role-aware nav and KPI components are wired. */
export function DashboardStub({
  title,
  subtitle,
  stats,
  note,
}: {
  title: string;
  subtitle: string;
  stats: Stat[];
  note: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            hint={s.hint}
            trend={s.trend}
          />
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-background p-8 text-body text-muted">
        {note}
      </div>
    </div>
  );
}
