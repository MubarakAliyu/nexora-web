"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Phone,
  Envelope,
  Home,
  FileLines,
  Cash,
  CreditCardPlus,
  AdjustmentsHorizontal,
  Users,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate, fromNow } from "@/lib/format";
import {
  getTenant,
  propertyName,
  NOW_ISO,
  type Invoice,
  type Payment,
  type MaintenanceTicket,
  type Scope,
} from "@/lib/api/admin";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error } = useAsync(() => getTenant(params.id, scope), [params.id, scope]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-28 w-full rounded-xl" />
        <SkeletonText className="mt-6" lines={3} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <EmptyState
        icon={<Users size={22} />}
        title="Tenant not found"
        description={error ?? "This tenant doesn’t exist or couldn’t be loaded."}
        action={<Button variant="outline" onClick={() => router.push("/admin/tenants")}>Back to tenants</Button>}
      />
    );
  }

  const { tenant, lease, unit, invoices, payments, tickets } = data;
  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paid), 0);

  const invoiceNo = (id: string) => invoices.find((i) => i.id === id)?.number ?? "—";

  const paymentColumns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "invoiceId", header: "Invoice", render: (p) => invoiceNo(p.invoiceId) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatUGX(p.amount) },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
    { key: "reference", header: "Reference", render: (p) => <span className="text-muted">{p.reference}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  const invoiceColumns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", sortable: true, render: (i) => <span className="font-medium text-foreground">{i.number}</span> },
    { key: "issued", header: "Issued", sortable: true, render: (i) => formatDate(i.issued) },
    { key: "due", header: "Due", sortable: true, render: (i) => formatDate(i.due) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (i) => formatUGX(i.amount) },
    { key: "status", header: "Status", sortable: true, render: (i) => <StatusBadge status={i.status} /> },
  ];

  const ticketColumns: Column<MaintenanceTicket>[] = [
    { key: "ref", header: "Ref", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.ref}</span> },
    { key: "title", header: "Issue", render: (t) => t.title },
    { key: "priority", header: "Priority", sortable: true, render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: "createdAt", header: "Raised", sortable: true, align: "right", render: (t) => formatDate(t.createdAt) },
  ];

  // Merge recent payments + tickets into one activity feed for the Timeline.
  const feed = [
    ...payments.map((p) => ({ id: p.id, at: p.date, text: `Paid ${formatUGX(p.amount)} (${invoiceNo(p.invoiceId)})` })),
    ...tickets.map((t) => ({ id: t.id, at: t.createdAt, text: `Raised ticket ${t.ref} — ${t.title}` })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title={tenant.name}
        subtitle={`Tenant · ${propertyName(tenant.propertyId)}`}
        actions={
          <Button className="gap-2" onClick={() => toast.info("Message tenant", { description: "Messaging is mocked in this build." })}>
            <Envelope size={18} /> Message
          </Button>
        }
      />

      {/* Profile card */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-h3">{initials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-h3 font-semibold text-foreground">{tenant.name}</p>
                <StatusBadge status={tenant.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
                <span className="inline-flex items-center gap-1.5"><Envelope size={14} /> {tenant.email}</span>
                <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {tenant.phone}</span>
                <span className="inline-flex items-center gap-1.5"><Home size={14} /> Unit {unit?.label ?? "—"}</span>
              </div>
            </div>
          </div>
          <p className="text-caption text-muted">Tenant since {formatDate(tenant.since)}</p>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Monthly rent" value={lease ? formatUGX(lease.rent) : "—"} icon={<Cash size={22} />} />
            <StatCard label="Deposit" value={lease ? formatUGX(lease.deposit) : "—"} icon={<CreditCardPlus size={22} />} />
            <StatCard label="Outstanding" value={formatUGX(outstanding)} icon={<FileLines size={22} />} hint={outstanding > 0 ? "action needed" : "all settled"} />
            <StatCard label="Open tickets" value={tickets.filter((t) => t.status !== "closed" && t.status !== "completed").length} icon={<AdjustmentsHorizontal size={22} />} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Lease summary */}
            <Card className="p-6 lg:col-span-1">
              <h3 className="mb-4 font-heading text-h3 font-semibold text-foreground">Lease</h3>
              {lease ? (
                <dl className="space-y-3 text-body">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd><StatusBadge status={lease.status} /></dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Start</dt><dd className="text-foreground">{formatDate(lease.start)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">End</dt><dd className="text-foreground">{formatDate(lease.end)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Frequency</dt><dd className="capitalize text-foreground">{lease.frequency}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Unit</dt><dd className="text-foreground">{unit?.label} · {unit?.type}</dd></div>
                </dl>
              ) : (
                <p className="text-body text-muted">No active lease.</p>
              )}
              <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => toast.info("Renew lease", { description: "Lease actions are mocked in this build." })}>
                Renew lease
              </Button>
            </Card>

            {/* Activity timeline */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="mb-5 font-heading text-h3 font-semibold text-foreground">Recent activity</h3>
              {feed.length > 0 ? (
                <Timeline>
                  {feed.map((f) => (
                    <TimelineItem key={f.id} title={f.text} time={fromNow(f.at, NOW_ISO)} />
                  ))}
                </Timeline>
              ) : (
                <EmptyState title="No activity yet" description="Payments and tickets will appear here." />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <DataTable columns={paymentColumns} data={payments} getRowId={(p) => p.id} emptyTitle="No payments yet" emptyDescription="Payments from this tenant will appear here." pageSize={8} />
        </TabsContent>

        <TabsContent value="invoices">
          <DataTable columns={invoiceColumns} data={invoices} getRowId={(i) => i.id} emptyTitle="No invoices yet" emptyDescription="Invoices for this tenant will appear here." pageSize={8} />
        </TabsContent>

        <TabsContent value="tickets">
          <DataTable columns={ticketColumns} data={tickets} getRowId={(t) => t.id} emptyTitle="No tickets" emptyDescription="Maintenance requests from this tenant will appear here." pageSize={8} />
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            icon={<FileLines size={22} />}
            title="No documents yet"
            description="Signed lease, ID copies and correspondence will live here."
            action={<Button variant="outline" onClick={() => toast.info("Upload document", { description: "Document upload is mocked in this build." })}>Upload document</Button>}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Link href="/admin/tenants" className="text-body font-medium text-primary transition-colors hover:text-accent">
          ← Back to tenants
        </Link>
      </div>
    </div>
  );
}
