"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Grid, ClipboardList, Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { selectClass } from "@/components/forms/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { listLeads, type Lead, type Scope } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const STAGES: { status: Lead["status"]; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "qualified", label: "Qualified" },
  { status: "proposal", label: "Proposal" },
  { status: "won", label: "Won" },
  { status: "lost", label: "Lost" },
];

export default function LeadsPage() {
  const router = useRouter();
  const [view, setView] = React.useState<"table" | "pipeline">("table");
  const [status, setStatus] = React.useState("all");
  const [q, setQ] = React.useState("");
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listLeads({ status, q }, scope), [status, q, scope]);
  const leads = data ?? [];

  const columns: Column<Lead>[] = [
    { key: "name", header: "Lead", sortable: true, render: (l) => <div><p className="font-medium text-foreground">{l.name}</p><p className="text-caption text-muted">{l.email}</p></div> },
    { key: "source", header: "Source", sortable: true, render: (l) => <span className={cn(l.source.startsWith("Website") || l.source.startsWith("Investor") ? "text-primary" : "text-muted")}>{l.source}</span> },
    { key: "service", header: "Interested in", render: (l) => l.service },
    { key: "value", header: "Est. value", sortable: true, align: "right", render: (l) => formatUGX(l.value) },
    { key: "status", header: "Stage", sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    { key: "createdAt", header: "Created", sortable: true, align: "right", render: (l) => formatDate(l.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="CRM / Leads" subtitle="Prospects and enquiries — including live submissions from the marketing site" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-md border border-border p-0.5">
          <button type="button" onClick={() => setView("table")}
            className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-medium transition-colors", view === "table" ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
            <ClipboardList size={16} /> Table
          </button>
          <button type="button" onClick={() => setView("pipeline")}
            className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-medium transition-colors", view === "pipeline" ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
            <Grid size={16} /> Pipeline
          </button>
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads…" aria-label="Search leads" className="h-10 pl-10" />
        </div>
        {view === "table" && (
          <select className={`${selectClass} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by stage">
            <option value="all">All stages</option>
            {STAGES.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
          </select>
        )}
      </div>

      {view === "table" ? (
        <DataTable columns={columns} data={leads} getRowId={(l) => l.id} loading={loading} error={error} onRetry={reload}
          onRowClick={(l) => router.push(`/admin/leads/${l.id}`)}
          emptyTitle="No leads found" emptyDescription="Leads from the marketing site and referrals will appear here." pageSize={10} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState title="Couldn’t load pipeline" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.status === stage.status);
            return (
              <div key={stage.status} className="rounded-lg bg-surface-hover/50 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-heading text-body font-semibold text-foreground">{stage.label}</h3>
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-caption font-medium text-muted">{items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.length === 0 ? <p className="px-1 py-6 text-center text-caption text-muted">Empty</p> : items.map((l) => (
                    <button key={l.id} type="button" onClick={() => router.push(`/admin/leads/${l.id}`)}
                      className="w-full rounded-lg border border-border bg-surface-elevated p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <p className="text-body font-medium text-foreground">{l.name}</p>
                      <p className="mt-0.5 text-caption text-muted">{l.service}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="muted">{formatUGX(l.value)}</Badge>
                        {(l.source.startsWith("Website") || l.source.startsWith("Investor")) && <span className="text-caption text-primary">web</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
