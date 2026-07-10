"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building,
  Home,
  Cash,
  AdjustmentsHorizontal,
  ChartLineUp,
  Receipt,
  ExclamationCircle,
  Clock,
  CheckCircle,
  ArrowUp,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { AreaChart, BarChart } from "@/components/ui/chart";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton, SkeletonChart } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { roleLabels } from "@/lib/roles";
import { fromNow } from "@/lib/format";
import {
  getDashboardStats,
  getActivity,
  getAlerts,
  getOccupancySeries,
  getRevenueSeries,
  NOW_ISO,
  type Scope,
} from "@/lib/api/admin";

function MoneyStat({ value }: { value: number }) {
  const m = value / 1_000_000;
  return (
    <span>
      UGX <CountUp to={m} decimals={m < 100 ? 1 : 0} duration={1.2} immediate />M
    </span>
  );
}

export default function AdminDashboardPage() {
  const user = useSession((s) => s.user);
  const role = user?.role ?? "super_admin";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const stats = useAsync(() => getDashboardStats(scope), [scope]);
  const activity = useAsync(() => getActivity(scope), [scope]);
  const alerts = useAsync(() => getAlerts(scope), [scope]);
  const occupancy = useAsync(() => getOccupancySeries(scope), [scope]);
  const revenue = useAsync(() => getRevenueSeries(scope), [scope]);

  const showRevenue = role !== "property_manager";
  const showOccupancy = role !== "finance_officer";

  const subtitle =
    role === "finance_officer"
      ? "Collections, revenue and outstanding balances across the portfolio"
      : role === "property_manager"
        ? "Occupancy, tenancies and maintenance across your properties"
        : "Operations overview across the entire portfolio";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle={subtitle}
        actions={<span className="hidden text-caption text-muted sm:block">Signed in as {roleLabels[role]}</span>}
      />

      {/* KPI tiles */}
      {stats.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : stats.error ? (
        <EmptyState
          icon={<ExclamationCircle size={22} />}
          title="Couldn’t load metrics"
          description={stats.error}
          action={<Button variant="outline" size="sm" onClick={stats.reload}>Try again</Button>}
        />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Properties" value={<CountUp to={stats.data.properties} duration={1.2} immediate />} icon={<Building size={22} />} hint="under management" />
          <StatCard label="Units" value={<CountUp to={stats.data.units} duration={1.4} immediate />} icon={<Home size={22} />} hint="across the portfolio" />
          <StatCard label="Occupancy" value={<CountUp to={stats.data.occupancy} duration={1.4} suffix="%" immediate />} icon={<ChartLineUp size={22} />} trend={{ value: "3.2%", direction: "up" }} hint="vs last quarter" />
          <StatCard label="Monthly revenue" value={<MoneyStat value={stats.data.monthlyRevenue} />} icon={<Cash size={22} />} trend={{ value: "4.1%", direction: "up" }} />
          <StatCard label="Outstanding rent" value={<MoneyStat value={stats.data.outstanding} />} icon={<Receipt size={22} />} hint="pending + overdue" />
          <StatCard label="Open tickets" value={<CountUp to={stats.data.openTickets} duration={1.2} immediate />} icon={<AdjustmentsHorizontal size={22} />} hint="needing attention" />
        </div>
      ) : null}

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {showOccupancy && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-h3 font-semibold text-foreground">Occupancy trend</h2>
              <span className="text-caption text-muted">Last 6 months</span>
            </div>
            {occupancy.loading ? (
              <SkeletonChart className="border-0 p-0" />
            ) : occupancy.error ? (
              <EmptyState title="Couldn’t load chart" description={occupancy.error} action={<Button variant="outline" size="sm" onClick={occupancy.reload}>Try again</Button>} />
            ) : (
              <AreaChart
                data={(occupancy.data ?? []).map((d) => ({ month: d.label, occupancy: d.value }))}
                xKey="month"
                series={[{ key: "occupancy", label: "Occupancy %" }]}
                height={260}
              />
            )}
          </Card>
        )}
        {showRevenue && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-h3 font-semibold text-foreground">Revenue (UGX M)</h2>
              <span className="text-caption text-muted">Last 6 months</span>
            </div>
            {revenue.loading ? (
              <SkeletonChart className="border-0 p-0" />
            ) : revenue.error ? (
              <EmptyState title="Couldn’t load chart" description={revenue.error} action={<Button variant="outline" size="sm" onClick={revenue.reload}>Try again</Button>} />
            ) : (
              <BarChart
                data={(revenue.data ?? []).map((d) => ({ month: d.label, revenue: d.value }))}
                xKey="month"
                series={[{ key: "revenue", label: "Revenue" }]}
                height={260}
              />
            )}
          </Card>
        )}
      </div>

      {/* Activity + Alerts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-5 font-heading text-h3 font-semibold text-foreground">Recent activity</h2>
          {activity.loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : activity.error ? (
            <EmptyState title="Couldn’t load activity" description={activity.error} action={<Button variant="outline" size="sm" onClick={activity.reload}>Try again</Button>} />
          ) : activity.data && activity.data.length > 0 ? (
            <Timeline>
              {activity.data.map((a) => (
                <TimelineItem key={a.id} title={a.text} time={fromNow(a.at, NOW_ISO)} />
              ))}
            </Timeline>
          ) : (
            <EmptyState title="No recent activity" description="Activity across the portfolio will show here." />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 font-heading text-h3 font-semibold text-foreground">Alerts</h2>
          {alerts.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : alerts.error ? (
            <EmptyState title="Couldn’t load alerts" description={alerts.error} action={<Button variant="outline" size="sm" onClick={alerts.reload}>Try again</Button>} />
          ) : alerts.data && alerts.data.length > 0 ? (
            <ul className="space-y-2.5">
              {alerts.data.map((al) => {
                const Icon = al.kind === "lease" ? Clock : al.kind === "invoice" ? Receipt : ExclamationCircle;
                return (
                  <li key={al.id}>
                    <Link
                      href={al.href}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                    >
                      <span className={al.severity === "danger" ? "mt-0.5 text-primary" : "mt-0.5 text-muted"}>
                        <Icon size={18} />
                      </span>
                      <span className="text-body text-foreground">{al.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle size={22} />} title="All clear" description="No alerts right now." />
          )}
          <Link href="/admin/analytics" className="mt-4 inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors hover:text-accent">
            View analytics <ArrowUp size={14} className="rotate-45" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
