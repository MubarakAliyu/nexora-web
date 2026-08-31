"use client";

import * as React from "react";
import Link from "next/link";
import { Building, Home, ChartLineUp, Cash, Receipt, AngleRight, CalendarMonth, ArrowUp, ArrowDown, CheckCircle, ClipboardCheck, ArrowRight } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { OwnerPropertyCard } from "@/components/app/owner-property-card";
import { StatusBadge } from "@/components/app/status";
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
import { ticketsAwaitingOwnerApproval } from "@/lib/api/maintenance-routing";
import { fromNow, formatDate, formatCurrency } from "@/lib/format";
import {
  getDashboardStats, getRevenueSeries, getOccupancySeries, getOwnerActivity, getOwnerSnapshot, listProperties, NOW_ISO, type Scope,
} from "@/lib/api/admin";
import { listBookings } from "@/lib/api/rentals";

function MoneyStat({ value }: { value: number }) {
  const m = value / 1_000_000;
  return <span>UGX <CountUp to={m} decimals={m < 100 ? 1 : 0} duration={1.2} immediate />M</span>;
}

export default function OwnerDashboardPage() {
  const user = useSession((s) => s.user);
  const ownerId = user?.ownerId;
  const pendingApprovals = React.useMemo(() => (ownerId ? ticketsAwaitingOwnerApproval(ownerId) : []), [ownerId]);
  const scope: Scope = React.useMemo(() => ({ ownerId, forceError: debugErrorFlag() }), [ownerId]);

  const stats = useAsync(() => getDashboardStats(scope), [scope]);
  const revenue = useAsync(() => getRevenueSeries(scope), [scope]);
  const occupancy = useAsync(() => getOccupancySeries(scope), [scope]);
  const activity = useAsync(() => getOwnerActivity(ownerId ?? "", scope), [ownerId, scope]);
  const snapshot = useAsync(() => getOwnerSnapshot(ownerId ?? "", scope), [ownerId, scope]);
  const properties = useAsync(() => listProperties(undefined, scope), [scope]);
  const bookings = useAsync(() => listBookings({ ownerId }), [ownerId]);
  const recentBookings = (bookings.data ?? []).slice(0, 6);

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

      {/* F3 — repairs blocked on this owner's decision. Placed above the fold
          because work does not proceed until they act. */}
      {pendingApprovals.length > 0 && (
        <Card className="mb-6 flex flex-col items-start justify-between gap-4 border-l-4 border-accent p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
              <ClipboardCheck size={22} />
            </span>
            <div>
              <p className="text-caption font-medium uppercase tracking-wide text-muted">Action needed</p>
              <p className="mt-1 font-heading text-h3 font-semibold text-foreground">
                You have {pendingApprovals.length} maintenance approval{pendingApprovals.length === 1 ? "" : "s"} awaiting your decision
              </p>
              <p className="mt-0.5 text-caption text-muted">Work cannot be scheduled until you approve or decline.</p>
            </div>
          </div>
          <Button asChild className="gap-2"><Link href="/owner/approvals">Review approvals <ArrowRight size={16} /></Link></Button>
        </Card>
      )}

      {/* Units occupancy + settlement */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Units</h2>
            <span className="text-caption text-muted">occupied vs vacant</span>
          </div>
          {snapshot.loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : snapshot.error ? (
            <EmptyState title="Couldn’t load units" description={snapshot.error} action={<Button variant="outline" size="sm" onClick={snapshot.reload}>Try again</Button>} />
          ) : snapshot.data ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Occupied", value: snapshot.data.units.occupied },
                  { label: "Vacant", value: snapshot.data.units.vacant },
                  { label: "On notice", value: snapshot.data.units.notice },
                  { label: "Maintenance", value: snapshot.data.units.maintenance },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-3">
                    <p className="font-heading text-h2 font-semibold text-foreground">{s.value}</p>
                    <p className="text-caption text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
              {snapshot.data.units.total > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-caption text-muted">
                    <span>{snapshot.data.units.occupied} of {snapshot.data.units.total} occupied</span>
                    <span>{Math.round((snapshot.data.units.occupied / snapshot.data.units.total) * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(snapshot.data.units.occupied / snapshot.data.units.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Settlement</h2>
            <Link href="/owner/financials" className="inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors hover:text-accent">
              Financials <AngleRight size={14} />
            </Link>
          </div>
          {snapshot.loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : snapshot.data ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-caption uppercase tracking-wide text-muted">Next settlement{snapshot.data.settlement.nextPeriod ? ` · ${snapshot.data.settlement.nextPeriod}` : ""}</p>
                  <StatusBadge status="pending" />
                </div>
                <p className="mt-1 font-heading text-h2 font-semibold text-primary">{formatCurrency(snapshot.data.settlement.pending)}</p>
                {snapshot.data.settlement.nextDate && <p className="mt-0.5 text-caption text-muted">Scheduled {formatDate(snapshot.data.settlement.nextDate)}</p>}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-primary"><CheckCircle size={18} /></span>
                  <p className="text-body text-muted">Paid to date</p>
                </div>
                <p className="font-heading text-h3 font-semibold text-foreground">{formatCurrency(snapshot.data.settlement.paidToDate)}</p>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

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

      {/* Activity + bookings */}
      <div className="grid gap-4 lg:grid-cols-2">
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

        <Card className="p-6">
          <h2 className="mb-5 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground">
            <CalendarMonth size={20} className="text-primary" /> Recent bookings
          </h2>
          {bookings.loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentBookings.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-foreground">{b.guestName}</p>
                    <p className="truncate text-caption text-muted">{b.propertyName} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No bookings yet" description="Short-term stays on your properties will show here." />
          )}
        </Card>
      </div>

      {/* Transaction history */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-h3 font-semibold text-foreground">Transaction history</h2>
          <span className="text-caption text-muted">rent received &amp; disbursements</span>
        </div>
        {snapshot.loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : snapshot.error ? (
          <EmptyState title="Couldn’t load transactions" description={snapshot.error} action={<Button variant="outline" size="sm" onClick={snapshot.reload}>Try again</Button>} />
        ) : snapshot.data && snapshot.data.transactions.length > 0 ? (
          <ul className="divide-y divide-border">
            {snapshot.data.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={t.direction === "in" ? "text-primary" : "text-muted"}>
                    {t.direction === "in" ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-foreground">{t.label}</p>
                    <p className="truncate text-caption text-muted">{formatDate(t.date)} · {t.status}</p>
                  </div>
                </div>
                <p className={`shrink-0 font-medium tabular-nums ${t.direction === "in" ? "text-foreground" : "text-muted"}`}>
                  {t.direction === "in" ? "+" : "−"}{formatCurrency(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No transactions yet" description="Rent received and disbursements will appear here." />
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
