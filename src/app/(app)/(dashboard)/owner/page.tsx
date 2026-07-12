"use client";

import * as React from "react";
import Link from "next/link";
import { Building, Home, ChartLineUp, Cash, Receipt, AngleRight } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { OwnerPropertyCard } from "@/components/app/owner-property-card";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { AreaChart, BarChart } from "@/components/ui/chart";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton, SkeletonChart, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { fromNow } from "@/lib/format";
import {
  getDashboardStats, getRevenueSeries, getOccupancySeries, getOwnerActivity, listProperties, NOW_ISO, type Scope,
} from "@/lib/api/admin";

function MoneyStat({ value }: { value: number }) {
  const m = value / 1_000_000;
  return <span>UGX <CountUp to={m} decimals={m < 100 ? 1 : 0} duration={1.2} immediate />M</span>;
}

export default function OwnerDashboardPage() {
  const user = useSession((s) => s.user);
  const ownerId = user?.ownerId;
  const scope: Scope = React.useMemo(() => ({ ownerId, forceError: debugErrorFlag() }), [ownerId]);

  const stats = useAsync(() => getDashboardStats(scope), [scope]);
  const revenue = useAsync(() => getRevenueSeries(scope), [scope]);
  const occupancy = useAsync(() => getOccupancySeries(scope), [scope]);
  const activity = useAsync(() => getOwnerActivity(ownerId ?? "", scope), [ownerId, scope]);
  const properties = useAsync(() => listProperties(undefined, scope), [scope]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle="A calm overview of everything Nexora is managing for you"
      />

      {/* KPIs */}
      {stats.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-24" /></Card>)}
        </div>
      ) : stats.error ? (
        <EmptyState icon={<Building size={22} />} title="Couldn’t load your overview" description={stats.error} action={<Button variant="outline" size="sm" onClick={stats.reload}>Try again</Button>} />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Properties" value={<CountUp to={stats.data.properties} immediate />} icon={<Building size={22} />} hint="you own" />
          <StatCard label="Units" value={<CountUp to={stats.data.units} immediate />} icon={<Home size={22} />} />
          <StatCard label="Occupancy" value={<CountUp to={stats.data.occupancy} suffix="%" immediate />} icon={<ChartLineUp size={22} />} trend={{ value: "2.4%", direction: "up" }} />
          <StatCard label="This month" value={<MoneyStat value={stats.data.monthlyRevenue} />} icon={<Cash size={22} />} hint="gross revenue" />
          <StatCard label="Outstanding" value={<MoneyStat value={stats.data.outstanding} />} icon={<Receipt size={22} />} hint="across portfolio" />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Revenue trend</h2>
            <span className="text-caption text-muted">UGX M · last 6 months</span>
          </div>
          {revenue.loading ? <SkeletonChart className="border-0 p-0" /> : revenue.error ? (
            <EmptyState title="Couldn’t load chart" description={revenue.error} action={<Button variant="outline" size="sm" onClick={revenue.reload}>Try again</Button>} />
          ) : (
            <BarChart data={(revenue.data ?? []).map((d) => ({ month: d.label, revenue: d.value }))} xKey="month" series={[{ key: "revenue", label: "Revenue" }]} height={260} />
          )}
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Occupancy</h2>
            <span className="text-caption text-muted">last 6 months</span>
          </div>
          {occupancy.loading ? <SkeletonChart className="border-0 p-0" /> : occupancy.error ? (
            <EmptyState title="Couldn’t load chart" description={occupancy.error} action={<Button variant="outline" size="sm" onClick={occupancy.reload}>Try again</Button>} />
          ) : (
            <AreaChart data={(occupancy.data ?? []).map((d) => ({ month: d.label, occupancy: d.value }))} xKey="month" series={[{ key: "occupancy", label: "Occupancy %" }]} height={260} />
          )}
        </Card>
      </div>

      {/* Activity */}
      <Card className="p-6">
        <h2 className="mb-5 font-heading text-h3 font-semibold text-foreground">Recent activity</h2>
        {activity.loading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex gap-3"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 flex-1" /></div>)}</div>
        ) : activity.error ? (
          <EmptyState title="Couldn’t load activity" description={activity.error} action={<Button variant="outline" size="sm" onClick={activity.reload}>Try again</Button>} />
        ) : activity.data && activity.data.length > 0 ? (
          <Timeline>
            {activity.data.map((a) => <TimelineItem key={a.id} title={a.text} time={fromNow(a.at, NOW_ISO)} />)}
          </Timeline>
        ) : (
          <EmptyState title="No recent activity" description="Activity on your properties will show here." />
        )}
      </Card>

      {/* Properties quick glance */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-h2 font-semibold text-foreground">Your properties</h2>
          <Link href="/owner/properties" className="inline-flex items-center gap-1 text-body font-medium text-primary transition-colors hover:text-accent">
            View all <AngleRight size={16} />
          </Link>
        </div>
        {properties.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : properties.error ? (
          <EmptyState title="Couldn’t load properties" description={properties.error} action={<Button variant="outline" size="sm" onClick={properties.reload}>Try again</Button>} />
        ) : properties.data && properties.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {properties.data.map((p) => <OwnerPropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <EmptyState title="No properties yet" description="Properties you own will appear here." />
        )}
      </div>
    </div>
  );
}
