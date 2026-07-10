"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { selectClass } from "@/components/forms/field";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import {
  listTenants,
  propertyName,
  unitLabel,
  propertyOptions,
  type Tenant,
  type Scope,
} from "@/lib/api/admin";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TenantsPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [property, setProperty] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const props = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(
    () => listTenants({ q, propertyId: property, status }, scope),
    [q, property, status, scope],
  );

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      header: "Tenant",
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-caption">{initials(t.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{t.name}</p>
            <p className="truncate text-caption text-muted">{t.email}</p>
          </div>
        </div>
      ),
    },
    { key: "propertyId", header: "Property", sortable: true, sortValue: (t) => propertyName(t.propertyId), render: (t) => propertyName(t.propertyId) },
    { key: "unitId", header: "Unit", render: (t) => unitLabel(t.unitId) },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: "since", header: "Tenant since", sortable: true, align: "right", render: (t) => formatDate(t.since) },
  ];

  return (
    <div>
      <PageHeader title="Tenants" subtitle="Everyone renting across the portfolio" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" aria-label="Search tenants" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-56`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {props.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className={`${selectClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="notice">On notice</option>
          <option value="past">Past</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        getRowId={(t) => t.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(t) => router.push(`/admin/tenants/${t.id}`)}
        emptyTitle="No tenants found"
        emptyDescription="Try adjusting your search or filters."
        pageSize={8}
      />
    </div>
  );
}
