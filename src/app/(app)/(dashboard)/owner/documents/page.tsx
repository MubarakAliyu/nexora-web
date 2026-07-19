"use client";

import * as React from "react";
import { FileLines, FileCheck, FileShield, FileDoc, Download, Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { selectClass } from "@/components/forms/field";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { statementPdf, leasePdfForProperty } from "@/lib/pdf/builders";
import { listProperties, type Property, type Scope } from "@/lib/api/admin";

type DocType = "Management Agreement" | "Title Deed" | "Insurance Policy" | "Lease Agreement" | "Statement";
interface OwnerDoc { id: string; name: string; type: DocType; propertyId: string; propertyName: string; date: string; }

const ICONS: Record<DocType, React.ComponentType<{ size?: number; className?: string }>> = {
  "Management Agreement": FileDoc,
  "Title Deed": FileCheck,
  "Insurance Policy": FileShield,
  "Lease Agreement": FileLines,
  Statement: FileLines,
};

function buildDocs(properties: Property[]): OwnerDoc[] {
  const docs: OwnerDoc[] = [];
  properties.forEach((p, i) => {
    docs.push({ id: `d_${p.id}_mgmt`, name: `${p.name} — Management Agreement`, type: "Management Agreement", propertyId: p.id, propertyName: p.name, date: p.since });
    docs.push({ id: `d_${p.id}_deed`, name: `${p.name} — Title Deed`, type: "Title Deed", propertyId: p.id, propertyName: p.name, date: p.since });
    docs.push({ id: `d_${p.id}_ins`, name: `${p.name} — Insurance Policy 2026`, type: "Insurance Policy", propertyId: p.id, propertyName: p.name, date: "2026-01-05" });
    if (i % 2 === 0) docs.push({ id: `d_${p.id}_lease`, name: `${p.name} — Tenancy Agreement`, type: "Lease Agreement", propertyId: p.id, propertyName: p.name, date: "2026-03-12" });
  });
  return docs;
}

export default function OwnerDocumentsPage() {
  const ownerId = useSession((s) => s.user?.ownerId);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("all");
  const scope: Scope = React.useMemo(() => ({ ownerId, forceError: debugErrorFlag() }), [ownerId]);
  const { data, loading, error, reload } = useAsync(() => listProperties(undefined, scope), [scope]);

  const docs = React.useMemo(() => {
    let rows = buildDocs(data ?? []);
    if (type !== "all") rows = rows.filter((d) => d.type === type);
    if (q) { const s = q.toLowerCase(); rows = rows.filter((d) => d.name.toLowerCase().includes(s)); }
    return rows;
  }, [data, type, q]);

  const columns: Column<OwnerDoc>[] = [
    {
      key: "name", header: "Document", sortable: true,
      render: (d) => {
        const Icon = ICONS[d.type];
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary"><Icon size={18} /></span>
            <span className="font-medium text-foreground">{d.name}</span>
          </div>
        );
      },
    },
    { key: "type", header: "Type", sortable: true, render: (d) => <Badge variant="muted">{d.type}</Badge> },
    { key: "propertyName", header: "Property", sortable: true },
    { key: "date", header: "Date", sortable: true, align: "right", render: (d) => formatDate(d.date) },
    {
      key: "dl", header: "", align: "right",
      render: (d) => (
        <button type="button" aria-label={`Download ${d.name}`}
          onClick={(e) => {
            e.stopPropagation();
            if (d.type === "Lease Agreement") {
              const lease = leasePdfForProperty(d.propertyId);
              if (lease) { downloadPdf(lease.payload, lease.filename); return; }
            }
            const { payload, filename } = statementPdf(ownerId ?? "");
            downloadPdf(payload, filename);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary">
          <Download size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Documents" subtitle="Agreements, deeds and legal documents for your properties" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" aria-label="Search documents" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-56`} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          <option value="Management Agreement">Management Agreement</option>
          <option value="Title Deed">Title Deed</option>
          <option value="Insurance Policy">Insurance Policy</option>
          <option value="Lease Agreement">Lease Agreement</option>
        </select>
      </div>

      <DataTable
        columns={columns} data={docs} getRowId={(d) => d.id}
        loading={loading} error={error} onRetry={reload}
        emptyTitle="No documents" emptyDescription="Documents for your properties will appear here." pageSize={10}
      />
    </div>
  );
}
