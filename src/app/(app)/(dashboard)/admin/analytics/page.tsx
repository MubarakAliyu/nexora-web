"use client";

import * as React from "react";
import { ChartLineUp, Cash, Receipt, AdjustmentsHorizontal, Users, Download } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import { BarChart, LineChart, DonutChart, CHART_PALETTE } from "@/components/ui/chart";
import { Skeleton, SkeletonChart } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import { getAnalytics, type Scope } from "@/lib/api/admin";

export default function AnalyticsPage() {
  const [range, setRange] = React.useState("ytd");
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getAnalytics(scope), [scope]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Portfolio performance and operational metrics"
        actions={
          <div className="flex items-center gap-2">
            <select className={`${selectClass} w-40`} value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              <option value="30d">Last 30 days</option>
              <option value="quarter">This quarter</option>
              <option value="ytd">Year to date</option>
              <option value="12m">Last 12 months</option>
            </select>
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Export", { description: "CSV / PDF export is mocked in this build." })}>
              <Download size={18} /> Export
            </Button>
          </div>
        }
      />

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-24" /></Card>)}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2"><SkeletonChart /><SkeletonChart /></div>
        </>
      ) : error ? (
        <EmptyState icon={<ChartLineUp size={22} />} title="Couldn’t load analytics" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Occupancy rate" value={`${data.occupancyRate}%`} icon={<ChartLineUp size={22} />} trend={{ value: "1.8%", direction: "up" }} />
            <StatCard label="Collection rate" value={`${data.collectionRate}%`} icon={<Cash size={22} />} trend={{ value: "2.3%", direction: "up" }} />
            <StatCard label="Arrears" value={formatUGX(data.arrears)} icon={<Receipt size={22} />} hint="outstanding" />
            <StatCard label="Avg. resolution" value={`${data.avgResolutionDays}d`} icon={<AdjustmentsHorizontal size={22} />} hint="maintenance" />
            <StatCard label="Tenant retention" value={`${data.retentionRate}%`} icon={<Users size={22} />} trend={{ value: "0.9%", direction: "up" }} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Revenue by property (UGX M)</h2>
              <BarChart data={data.revenueByProperty} xKey="name" series={[{ key: "value", label: "Revenue" }]} height={300} />
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Collection rate trend</h2>
              <LineChart data={data.collectionTrend.map((d) => ({ month: d.label, rate: d.value }))} xKey="month" series={[{ key: "rate", label: "Collection %" }]} height={300} />
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Occupancy by category</h2>
              <DonutChart data={data.occupancyByCategory} height={300} colors={CHART_PALETTE} />
            </Card>
            <Card className="flex flex-col justify-center gap-4 p-6">
              <h2 className="font-heading text-h3 font-semibold text-foreground">Highlights</h2>
              <ul className="space-y-3 text-body text-muted">
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> Collection rate is trending up, now at <span className="font-medium text-foreground">{data.collectionRate}%</span>.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> Average maintenance resolution is <span className="font-medium text-foreground">{data.avgResolutionDays} days</span>.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> Tenant retention holding at <span className="font-medium text-foreground">{data.retentionRate}%</span> across the portfolio.</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> Arrears stand at <span className="font-medium text-foreground">{formatUGX(data.arrears)}</span> — prioritise overdue accounts.</li>
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
