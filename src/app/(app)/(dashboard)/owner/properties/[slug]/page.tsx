"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { MapPin, Building, Home, Cash, AdjustmentsHorizontal, CalendarMonth } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RentalTypeBadge } from "@/components/app/rental-type-badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatCurrency, formatDate, fromNow } from "@/lib/format";
import {
  getProperty, getPropertyUnits, listTickets, NOW_ISO,
  type Unit, type MaintenanceTicket, type Scope,
} from "@/lib/api/admin";
import { listBookings, type Booking } from "@/lib/api/rentals";

export default function OwnerPropertyDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const ownerId = useSession((s) => s.user?.ownerId);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const property = useAsync(() => getProperty(slug, scope), [slug, scope]);
  const units = useAsync(() => getPropertyUnits(slug, scope), [slug, scope]);
  const tickets = useAsync(() => listTickets({ propertyId: slug }, scope), [slug, scope]);
  const bookings = useAsync(() => listBookings({ ownerId }), [ownerId]);

  if (property.loading) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-52 w-full rounded-xl" /><SkeletonText className="mt-6" lines={3} /></div>;
  }
  // Read-access guard: an owner may only view their own properties.
  const notOwned = property.data && ownerId && property.data.ownerId !== ownerId;
  if (property.error || !property.data || notOwned) {
    return (
      <EmptyState icon={<Building size={22} />} title="Property not found"
        description={notOwned ? "This property isn’t part of your portfolio." : (property.error ?? "This property couldn’t be loaded.")}
        action={<Button variant="outline" asChild><Link href="/owner/properties">Back to My Properties</Link></Button>} />
    );
  }

  const p = property.data;
  const occupied = Math.round((p.units * p.occupancy) / 100);
  const isShort = p.rentalType === "short-term";
  const propBookings = (bookings.data ?? []).filter((b) => b.propertyId === p.id);
  const activeBookings = propBookings.filter((b) => b.status !== "cancelled" && b.status !== "checked_out");

  const bookingColumns: Column<Booking>[] = [
    { key: "reference", header: "Reference", render: (b) => <span className="font-medium text-foreground">{b.reference}</span> },
    { key: "guestName", header: "Guest", render: (b) => b.guestName },
    { key: "checkIn", header: "Stay", render: (b) => <span className="text-body">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span> },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  ];

  const unitColumns: Column<Unit>[] = [
    { key: "label", header: "Unit", sortable: true, render: (u) => <span className="font-medium text-foreground">{u.label}</span> },
    { key: "type", header: "Type", sortable: true },
    { key: "floor", header: "Floor", sortable: true, align: "right" },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (u) => formatCurrency(u.rent) },
    { key: "status", header: "Status", sortable: true, render: (u) => <StatusBadge status={u.status} /> },
  ];

  const recentTickets = (tickets.data ?? []).slice(0, 6);

  return (
    <div>
      <PageHeader title={p.name} subtitle={p.location} />

      {/* Hero */}
      <Card variant="media" className="mb-6">
        <div className="relative h-52 w-full md:h-64">
          <Image src={p.image} alt={p.name} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-0 left-0 flex flex-wrap items-center gap-3 p-5">
            <StatusBadge status={p.status} />
            <RentalTypeBadge type={p.rentalType} />
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-background"><MapPin size={16} /> {p.location}</span>
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-background"><Building size={16} /> {p.category}</span>
          </div>
        </div>
      </Card>

      {/* KPIs (read-only view) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Units" value={<span>{occupied}<span className="text-h3 text-muted"> / {p.units}</span></span>} icon={<Home size={22} />} hint="occupied" />
        <StatCard label="Occupancy" value={`${p.occupancy}%`} icon={<AdjustmentsHorizontal size={22} />} />
        <StatCard label="Revenue / mo" value={formatCurrency(p.monthlyRevenue)} icon={<Cash size={22} />} />
      </div>

      {/* Current bookings — short-term rentals only */}
      {isShort && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Current bookings</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-medium text-primary">
              <CalendarMonth size={13} /> {activeBookings.length} active / upcoming
            </span>
          </div>
          <DataTable
            columns={bookingColumns} data={activeBookings} getRowId={(b) => b.id}
            loading={bookings.loading} error={bookings.error} onRetry={bookings.reload}
            emptyTitle="No active bookings" emptyDescription="Confirmed and upcoming stays will appear here." pageSize={6}
          />
        </section>
      )}

      {/* Units */}
      <section className="mt-8">
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Units</h2>
        <DataTable
          columns={unitColumns} data={units.data ?? []} getRowId={(u) => u.id}
          loading={units.loading} error={units.error} onRetry={units.reload}
          emptyTitle="No units recorded" emptyDescription="Units for this property will appear here." pageSize={8}
        />
      </section>

      {/* Maintenance activity (read-only) */}
      <section className="mt-8">
        <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Recent maintenance</h2>
        <Card className="p-6">
          {tickets.loading ? (
            <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex gap-3"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 flex-1" /></div>)}</div>
          ) : tickets.error ? (
            <EmptyState title="Couldn’t load maintenance" description={tickets.error} action={<Button variant="outline" size="sm" onClick={tickets.reload}>Try again</Button>} />
          ) : recentTickets.length > 0 ? (
            <Timeline>
              {recentTickets.map((t: MaintenanceTicket) => (
                <TimelineItem key={t.id} title={t.title} time={fromNow(t.updatedAt, NOW_ISO)}>
                  <span className="text-caption text-muted">{t.ref} · </span>
                  <StatusBadge status={t.status} className="ml-1 align-middle" />
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <EmptyState title="No maintenance activity" description="Nexora hasn’t logged any maintenance here recently." />
          )}
        </Card>
      </section>

      <div className="mt-8">
        <Link href="/owner/properties" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to My Properties</Link>
      </div>
    </div>
  );
}
