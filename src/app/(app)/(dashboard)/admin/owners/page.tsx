"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, PenNib } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { RowActions } from "@/components/app/row-actions";
import { OwnerFormDialog } from "@/components/admin/owner-form-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { listOwners, type Owner, type Scope } from "@/lib/api/admin";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function OwnersPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Owner | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listOwners(scope), [scope]);

  const rows = React.useMemo(() => {
    const all = data ?? [];
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter((o) => o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s));
  }, [data, q]);

  const columns: Column<Owner>[] = [
    {
      key: "name", header: "Owner", sortable: true,
      render: (o) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9"><AvatarFallback className="text-caption">{initials(o.name)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{o.name}</p>
            <p className="truncate text-caption text-muted">{o.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (o) => <span className="text-muted">{o.phone}</span> },
    { key: "properties", header: "Properties", sortable: true, align: "right", sortValue: (o) => o.propertyIds.length, render: (o) => o.propertyIds.length },
    { key: "since", header: "Owner since", sortable: true, align: "right", render: (o) => formatDate(o.since) },
    {
      key: "actions", header: "", align: "right",
      render: (o) => (
        <RowActions actions={[
          { label: "View", icon: <Search size={16} />, onClick: () => router.push(`/admin/owners/${o.id}`) },
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditing(o); setFormOpen(true); } },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Owners"
        subtitle="Property owners in the Nexora portfolio"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton data={data ?? []} filename="owners" columns={[
              { header: "Name", accessor: (o) => o.name },
              { header: "Email", accessor: (o) => o.email },
              { header: "Phone", accessor: (o) => o.phone },
              { header: "Properties", accessor: (o) => o.propertyIds.length },
              { header: "Since", accessor: (o) => o.since.slice(0, 10) },
            ]} />
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Add owner</Button>
          </div>
        }
      />
      <div className="mb-4 sm:max-w-xs">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search owners…" aria-label="Search owners" className="h-10 pl-10" />
        </div>
      </div>
      <DataTable
        columns={columns} data={rows} getRowId={(o) => o.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(o) => router.push(`/admin/owners/${o.id}`)}
        emptyTitle="No owners found" emptyDescription="Owners will appear here." pageSize={8}
      />

      <OwnerFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
    </div>
  );
}
