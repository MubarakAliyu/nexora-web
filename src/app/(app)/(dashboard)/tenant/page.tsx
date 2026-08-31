"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cash, CreditCardPlus, AdjustmentsHorizontal, FileLines, Home, CalendarMonth,
  Bullhorn, ArrowRight, ClipboardList, Tools,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RentalTypeBadge } from "@/components/app/rental-type-badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatCurrency, formatDate, fromNow } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { receiptPdf } from "@/lib/pdf/builders";
import { getTenant, listAnnouncements, propertyName, NOW_ISO, type Payment, type Scope } from "@/lib/api/admin";
import { tenantMaintenanceCharges } from "@/lib/api/maintenance-liability";

const QUICK_ACTIONS = [
  { label: "Pay rent", href: "/tenant/payments", icon: CreditCardPlus },
  { label: "New request", href: "/tenant/maintenance", icon: AdjustmentsHorizontal },
  { label: "My lease", href: "/tenant/lease", icon: FileLines },
  { label: "Documents", href: "/tenant/documents", icon: ClipboardList },
];

export default function TenantDashboardPage() {
  const user = useSession((s) => s.user);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const tenantId = user?.tenantId ?? "";
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const announcements = useAsync(() => listAnnouncements(), []);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-28" /></Card>
          ))}
        </div>
        <SkeletonText className="mt-6" lines={3} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <EmptyState
        icon={<Home size={22} />}
        title="Couldn’t load your tenancy"
        description={error ?? "We couldn’t find your lease."}
        action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>}
      />
    );
  }

  const { tenant, lease, unit, property, payments, tickets, invoices } = data;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const outstanding = unpaid.reduce((s, i) => s + (i.amount - i.paid), 0);
  const nextDue = [...unpaid].sort((a, b) => (a.due < b.due ? -1 : 1))[0];
  const openTickets = tickets.filter((t) => t.status !== "closed" && t.status !== "completed");
  const maintCharges = tenantMaintenanceCharges(tenant.id);
  const maintTotal = maintCharges.reduce((s, t) => s + (t.invoiceAmount ?? t.cost ?? 0), 0);
  // Match property announcements by id where one is stored (E5); fall back to the
  // label for records written before announcements carried a property id.
  const notices = (announcements.data ?? [])
    .filter((a) =>
      a.audience === "all_tenants" ||
      (a.audiencePropertyId ? a.audiencePropertyId === property?.id : a.audienceLabel === property?.name))
    .slice(0, 3);

  const paymentColumns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatCurrency(p.amount) },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { key: "receipt", header: "", align: "right", render: (p) => <Button variant="ghost" size="sm" onClick={() => { const { payload, filename } = receiptPdf(p); downloadPdf(payload, filename); }}>Receipt</Button> },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${tenant.name.split(" ")[0]}`}
        subtitle={`${unit?.label ?? "Your unit"} · ${propertyName(tenant.propertyId)}`}
        actions={<Button asChild className="gap-2"><Link href="/tenant/payments"><CreditCardPlus size={18} /> Pay rent</Link></Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly rent" value={lease ? formatCurrency(lease.rent) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={<FileLines size={22} />} hint={outstanding > 0 ? "due now" : "all settled"} />
        <StatCard label="Next rent due" value={nextDue ? formatDate(nextDue.due) : "—"} icon={<CalendarMonth size={22} />} hint={nextDue ? fromNow(nextDue.due, NOW_ISO) : "nothing scheduled"} />
        <StatCard label="Open requests" value={openTickets.length} icon={<AdjustmentsHorizontal size={22} />} />
      </div>

      {/* Next payment banner */}
      {nextDue && (
        <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-l-4 border-primary p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted">Next payment due</p>
            <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatCurrency(nextDue.amount - nextDue.paid)}</p>
            <p className="mt-1 text-body text-muted">{nextDue.number} · due {formatDate(nextDue.due)} ({fromNow(nextDue.due, NOW_ISO)})</p>
          </div>
          <Button asChild className="gap-2"><Link href="/tenant/payments">Pay now <ArrowRight size={16} /></Link></Button>
        </Card>
      )}

      {/* Maintenance charges — deliberately distinct from the rent banner above:
          its own icon and "Maintenance" label, so a tenant never mistakes a
          repair bill for their rent. */}
      {maintCharges.length > 0 && (
        <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-l-4 border-accent p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary"><Tools size={22} /></span>
            <div>
              <p className="text-caption font-medium uppercase tracking-wide text-muted">Maintenance charge</p>
              <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatCurrency(maintTotal)}</p>
              <p className="mt-1 text-body text-muted">
                {maintCharges.length === 1
                  ? `${maintCharges[0].title} · ${maintCharges[0].invoiceNumber}`
                  : `${maintCharges.length} unpaid maintenance invoices`}
                {maintCharges[0].invoiceDueDate ? ` · due ${formatDate(maintCharges[0].invoiceDueDate)}` : ""}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2"><Link href="/tenant/maintenance">View charge <ArrowRight size={16} /></Link></Button>
        </Card>
      )}

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-elevated p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-active text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={22} /></span>
            <span className="text-body font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      {/* Lease + payments */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">My lease</h2>
            <RentalTypeBadge type={property?.rentalType} />
          </div>
          {lease ? (
            <dl className="space-y-3 text-body">
              <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd><StatusBadge status={lease.status} /></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Unit</dt><dd className="text-foreground">{unit?.label} · {unit?.type}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Start</dt><dd className="text-foreground">{formatDate(lease.start)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">End</dt><dd className="text-foreground">{formatDate(lease.end)}</dd></div>
            </dl>
          ) : (
            <p className="text-body text-muted">No active lease found.</p>
          )}
          <Link href="/tenant/lease" className="mt-4 inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors hover:text-accent">
            View full lease <ArrowRight size={14} />
          </Link>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Recent payments</h2>
            <Link href="/tenant/payments" className="inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors hover:text-accent">All payments <ArrowRight size={14} /></Link>
          </div>
          <DataTable columns={paymentColumns} data={payments} getRowId={(p) => p.id} emptyTitle="No payments yet" emptyDescription="Your rent payments will show here." pageSize={5} />
        </Card>
      </div>

      {/* Open requests + notices */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Open requests</h2>
            <Link href="/tenant/maintenance" className="inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors hover:text-accent">All requests <ArrowRight size={14} /></Link>
          </div>
          {openTickets.length > 0 ? (
            <ul className="divide-y divide-border">
              {openTickets.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate text-body font-medium text-foreground">{t.title}</p><p className="text-caption text-muted">{t.ref} · {fromNow(t.updatedAt, NOW_ISO)}</p></div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No open requests" description="Submit a maintenance request and track it here." />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Bullhorn size={20} className="text-primary" /> Notices</h2>
          {notices.length > 0 ? (
            <ul className="space-y-4">
              {notices.map((n) => (
                <li key={n.id} className="border-l-2 border-border pl-4">
                  <p className="text-body font-medium text-foreground">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-caption text-muted">{n.body}</p>
                  <p className="mt-1 text-caption text-muted">{fromNow(n.sentAt, NOW_ISO)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No notices" description="Building notices and announcements will appear here." />
          )}
        </Card>
      </div>
    </div>
  );
}
