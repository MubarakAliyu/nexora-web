"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarMonth, MapPin, Users, ArrowRight, Home } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { listBookingsForEmail } from "@/lib/api/rentals";

export default function TenantBookingsPage() {
  const user = useSession((s) => s.user);
  const email = user?.email ?? "";
  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listBookingsForEmail(email, scope), [email, scope]);

  const now = Date.now();
  const upcoming = (data ?? []).filter((b) => new Date(b.checkOut).getTime() >= now && b.status !== "cancelled");
  const past = (data ?? []).filter((b) => new Date(b.checkOut).getTime() < now || b.status === "cancelled");

  const Row = ({ b }: { b: NonNullable<typeof data>[number] }) => (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-active text-primary"><Home size={22} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-h3 font-semibold text-foreground">{b.propertyName}</p>
            <StatusBadge status={b.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5"><CalendarMonth size={14} /> {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights</span>
            <span className="inline-flex items-center gap-1.5"><Users size={14} /> {b.adults} adults{b.children ? `, ${b.children} children` : ""}</span>
          </p>
          <p className="mt-1 text-caption text-muted">Ref {b.reference}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <p className="font-heading text-h3 font-semibold text-primary">{formatCurrency(b.total)}</p>
        <Link href={`/rentals/${b.propertyId}`} className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:text-accent">
          View rental <ArrowRight size={14} />
        </Link>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="My Bookings"
        subtitle="Your short-term stays booked through Nexora"
        actions={<Button asChild variant="outline" className="gap-2"><Link href="/rentals"><MapPin size={18} /> Browse rentals</Link></Button>}
      />

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState icon={<CalendarMonth size={22} />} title="Couldn’t load bookings" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<CalendarMonth size={22} />}
          title="No bookings yet"
          description="When you book a short-term stay it will appear here."
          action={<Button asChild><Link href="/rentals">Browse rentals</Link></Button>}
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Upcoming &amp; active</h2>
              <div className="space-y-3">{upcoming.map((b) => <Row key={b.id} b={b} />)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Past stays</h2>
              <div className="space-y-3">{past.map((b) => <Row key={b.id} b={b} />)}</div>
            </section>
          )}
        </div>
      )}

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>
    </div>
  );
}
