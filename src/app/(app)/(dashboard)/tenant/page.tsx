"use client";

import * as React from "react";
import { Cash, CreditCardPlus, AdjustmentsHorizontal, FileLines, Home } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatUGX, formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { receiptPdf } from "@/lib/pdf/builders";
import { getTenant, propertyName, type Payment, type Scope } from "@/lib/api/admin";

export default function TenantDashboardPage() {
  const user = useSession((s) => s.user);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const tenantId = user?.tenantId ?? "";
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);

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

  const { tenant, lease, unit, payments, tickets } = data;
  const outstanding = data.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paid), 0);
  const openTickets = tickets.filter((t) => t.status !== "closed" && t.status !== "completed").length;

  const paymentColumns: Column<Payment>[] = [
    { key: "date", header: "Date", sortable: true, render: (p) => formatDate(p.date) },
    { key: "amount", header: "Amount", sortable: true, align: "right", render: (p) => formatUGX(p.amount) },
    { key: "method", header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "receipt", header: "", align: "right",
      render: (p) => <Button variant="ghost" size="sm" onClick={() => { const { payload, filename } = receiptPdf(p); downloadPdf(payload, filename); }}>Receipt</Button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${tenant.name.split(" ")[0]}`}
        subtitle={`${unit?.label ?? "Your unit"} · ${propertyName(tenant.propertyId)}`}
        actions={<Button className="gap-2" onClick={() => toast.info("Pay rent", { description: "Payments are mocked in this build." })}>Pay rent</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly rent" value={lease ? formatUGX(lease.rent) : "—"} icon={<Cash size={22} />} />
        <StatCard label="Outstanding" value={formatUGX(outstanding)} icon={<FileLines size={22} />} hint={outstanding > 0 ? "due now" : "all settled"} />
        <StatCard label="Deposit held" value={lease ? formatUGX(lease.deposit) : "—"} icon={<CreditCardPlus size={22} />} />
        <StatCard label="Open tickets" value={openTickets} icon={<AdjustmentsHorizontal size={22} />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">My lease</h2>
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
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Recent payments</h2>
          <DataTable
            columns={paymentColumns}
            data={payments}
            getRowId={(p) => p.id}
            emptyTitle="No payments yet"
            emptyDescription="Your rent payments will show here."
            pageSize={5}
          />
        </Card>
      </div>

      <p className="mt-8 text-caption text-muted">
        The full Tenant portal — rent payment, maintenance requests and documents — arrives in Batch 11.
      </p>
    </div>
  );
}
