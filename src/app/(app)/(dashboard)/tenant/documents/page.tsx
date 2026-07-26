"use client";

import * as React from "react";
import Link from "next/link";
import { FileLines, FileCheck, Receipt, Download, Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatDate } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { leasePdf, receiptPdf, invoicePdf } from "@/lib/pdf/builders";
import { getTenant, type Scope } from "@/lib/api/admin";

type DocType = "Lease Agreement" | "Receipt" | "Invoice";
interface TenantDoc { id: string; name: string; type: DocType; date: string; download: () => void; }

const ICONS: Record<DocType, React.ComponentType<{ size?: number; className?: string }>> = {
  "Lease Agreement": FileCheck,
  Receipt: Receipt,
  Invoice: FileLines,
};

export default function TenantDocumentsPage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("all");

  const docs = React.useMemo<TenantDoc[]>(() => {
    if (!data) return [];
    const out: TenantDoc[] = [];
    if (data.lease) {
      out.push({ id: `doc_lease_${data.lease.id}`, name: `Tenancy Agreement — ${data.property?.name ?? ""}`, type: "Lease Agreement", date: data.lease.start, download: () => { const { payload, filename } = leasePdf(data.lease!); downloadPdf(payload, filename); } });
    }
    data.payments.filter((p) => p.status === "completed").forEach((p) => {
      out.push({ id: `doc_rcpt_${p.id}`, name: `Rent Receipt — ${p.reference}`, type: "Receipt", date: p.date, download: () => { const { payload, filename } = receiptPdf(p); downloadPdf(payload, filename); } });
    });
    data.invoices.forEach((inv) => {
      out.push({ id: `doc_inv_${inv.id}`, name: `Invoice — ${inv.number}`, type: "Invoice", date: inv.issued, download: () => { const { payload, filename } = invoicePdf(inv); downloadPdf(payload, filename); } });
    });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data]);

  const filtered = React.useMemo(() => {
    let rows = docs;
    if (type !== "all") rows = rows.filter((d) => d.type === type);
    if (q) { const s = q.toLowerCase(); rows = rows.filter((d) => d.name.toLowerCase().includes(s)); }
    return rows;
  }, [docs, type, q]);

  const columns: Column<TenantDoc>[] = [
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
    { key: "date", header: "Date", sortable: true, align: "right", render: (d) => formatDate(d.date) },
    {
      key: "dl", header: "", align: "right",
      render: (d) => (
        <button type="button" aria-label={`Download ${d.name}`} onClick={(e) => { e.stopPropagation(); d.download(); }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary">
          <Download size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Documents" subtitle="Your tenancy agreement, receipts and invoices" />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error || !data ? (
        <EmptyState icon={<FileLines size={22} />} title="Couldn’t load documents" description={error ?? "Please try again."} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" aria-label="Search documents" className="h-10 pl-10" />
            </div>
            <select className={`${selectClass} sm:w-52`} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
              <option value="all">All types</option>
              <option value="Lease Agreement">Lease Agreement</option>
              <option value="Receipt">Receipt</option>
              <option value="Invoice">Invoice</option>
            </select>
          </div>

          <DataTable columns={columns} data={filtered} getRowId={(d) => d.id} onRowClick={(d) => d.download()}
            emptyTitle="No documents" emptyDescription="Your documents will appear here." pageSize={12} />
        </>
      )}

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>
    </div>
  );
}
