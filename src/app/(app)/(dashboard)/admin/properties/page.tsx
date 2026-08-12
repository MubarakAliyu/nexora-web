"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Search, PenNib, TrashBin } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { PropertyWizard } from "@/components/admin/property-wizard";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import { listProperties, deleteProperty, type Property, type Scope } from "@/lib/api/admin";
import { categories } from "@/content/portfolio";

export default function PropertiesPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Property | null>(null);
  const [deleting, setDeleting] = React.useState<Property | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const { data, loading, error, reload } = useAsync(
    () => listProperties({ q, category, status }, scope),
    [q, category, status, scope],
  );

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Property) => { setEditing(p); setFormOpen(true); };

  const columns: Column<Property>[] = [
    {
      key: "name", header: "Property", sortable: true,
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
    { key: "category", header: "Category", sortable: true },
    { key: "units", header: "Units", sortable: true, align: "right" },
    {
      key: "occupancy", header: "Occupancy", sortable: true, align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-active">
            <div className="h-full rounded-full bg-primary" style={{ width: `${p.occupancy}%` }} />
          </div>
          <span className="tabular-nums text-foreground">{p.occupancy}%</span>
        </div>
      ),
    },
    { key: "monthlyRevenue", header: "Revenue / mo", sortable: true, align: "right", render: (p) => formatUGX(p.monthlyRevenue) },
    { key: "status", header: "Status", sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (p) => (
        <RowActions actions={[
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => openEdit(p) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(p), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Every property under Nexora management"
        actions={<Button onClick={openCreate} className="gap-2"><Plus size={18} /> Add property</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or location…" aria-label="Search properties" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-48`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={`${selectClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="managed">Managed</option>
          <option value="onboarding">Onboarding</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      <DataTable
        columns={columns} data={data ?? []} getRowId={(p) => p.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(p) => router.push(`/admin/properties/${p.id}`)}
        emptyTitle="No properties found" emptyDescription="Try adjusting your search or filters." pageSize={8}
      />

      <PropertyWizard open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <DeleteConfirmation
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        entityLabel="property"
        entityName={deleting?.name ?? ""}
        description="This cannot be undone. Its units and leases will be affected."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteProperty(deleting.id);
            toast.success("Property deleted", { description: `${deleting.name} was removed.` });
            reload();
          } catch {
            toast.error("Couldn’t delete property");
          }
        }}
      />
    </div>
  );
}
