"use client";

import * as React from "react";
import Image from "next/image";
import { Building, Home, Cash, ChartLineUp } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatUGX } from "@/lib/format";
import { getDashboardStats, listProperties, type Property, type Scope } from "@/lib/api/admin";

export default function OwnerDashboardPage() {
  const user = useSession((s) => s.user);
  const scope: Scope = React.useMemo(
    () => ({ ownerId: user?.ownerId, forceError: debugErrorFlag() }),
    [user?.ownerId],
  );
  const stats = useAsync(() => getDashboardStats(scope), [scope]);
  const props = useAsync(() => listProperties(undefined, scope), [scope]);

  const columns: Column<Property>[] = [
    {
      key: "name",
      header: "Property",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-active">
            <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{p.name}</p>
            <p className="truncate text-caption text-muted">{p.location}</p>
          </div>
        </div>
      ),
    },
    { key: "units", header: "Units", sortable: true, align: "right" },
    { key: "occupancy", header: "Occupancy", sortable: true, align: "right", render: (p) => `${p.occupancy}%` },
    { key: "monthlyRevenue", header: "Revenue / mo", sortable: true, align: "right", render: (p) => formatUGX(p.monthlyRevenue) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`} subtitle="Your portfolio at a glance" />

      {stats.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-28" /></Card>
          ))}
        </div>
      ) : stats.error ? (
        <EmptyState title="Couldn’t load your portfolio" description={stats.error} action={<Button variant="outline" size="sm" onClick={stats.reload}>Try again</Button>} />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Properties" value={<CountUp to={stats.data.properties} immediate />} icon={<Building size={22} />} hint="you own" />
          <StatCard label="Units" value={<CountUp to={stats.data.units} immediate />} icon={<Home size={22} />} />
          <StatCard label="Occupancy" value={<CountUp to={stats.data.occupancy} suffix="%" immediate />} icon={<ChartLineUp size={22} />} trend={{ value: "2.4%", direction: "up" }} />
          <StatCard label="Revenue / mo" value={<span>UGX <CountUp to={stats.data.monthlyRevenue / 1_000_000} decimals={0} immediate />M</span>} icon={<Cash size={22} />} />
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">My properties</h2>
        <DataTable
          columns={columns}
          data={props.data ?? []}
          getRowId={(p) => p.id}
          loading={props.loading}
          error={props.error}
          onRetry={props.reload}
          emptyTitle="No properties yet"
          emptyDescription="Properties you own will appear here."
          pageSize={6}
        />
      </div>

      <p className="mt-8 text-caption text-muted">
        The full Owner portal — per-property financials, downloadable statements and documents — arrives in Batch 10.
      </p>
    </div>
  );
}
