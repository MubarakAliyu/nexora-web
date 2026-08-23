"use client";

import * as React from "react";
import { Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { StatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate, formatUGX } from "@/lib/format";
import {
  listServiceBookings, getServiceBooking, updateServiceBookingStatus, assignServiceBooking,
} from "@/lib/api/rentals";
import type { ServiceBooking, ServiceBookingStatus } from "@/lib/mock/types";

const TECHS = ["James Odoi", "Fred Wanyama", "Peter Ssemakula", "SparkleClean Team", "GreenScape Crew"];
const STATUS_ACTIONS: { status: ServiceBookingStatus; label: string }[] = [
  { status: "assigned", label: "Assign" },
  { status: "in_progress", label: "Start" },
  { status: "completed", label: "Complete" },
  { status: "cancelled", label: "Cancel" },
];

function DetailDialog({ id, onOpenChange, onDone }: { id: string | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { data, loading, reload } = useAsync(() => (id ? getServiceBooking(id) : Promise.resolve(null as unknown as ServiceBooking)), [id]);
  const [busy, setBusy] = React.useState(false);
  const [assignee, setAssignee] = React.useState("");

  React.useEffect(() => { if (data?.assignee) setAssignee(data.assignee); }, [data?.assignee]);

  const setStatus = async (status: ServiceBookingStatus) => {
    if (!id) return;
    setBusy(true);
    try { await updateServiceBookingStatus(id, status); toast.success("Status updated"); reload(); onDone(); }
    catch { toast.error("Couldn’t update"); } finally { setBusy(false); }
  };
  const assign = async () => {
    if (!id || !assignee) return;
    setBusy(true);
    try { await assignServiceBooking(id, assignee); toast.success(`Assigned to ${assignee}`); reload(); onDone(); }
    catch { toast.error("Couldn’t assign"); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {loading || !data ? (
          <div className="space-y-3 py-6"><div className="h-6 w-40 animate-pulse rounded bg-surface-hover" /><div className="h-24 w-full animate-pulse rounded bg-surface-hover" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{data.reference} <Badge variant="muted">{data.kind === "cleaning" ? "Cleaning" : "Lifestyle"}</Badge></DialogTitle>
              <DialogDescription>{data.category}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-hover px-4 py-3">
                <span className="text-caption text-muted">Status</span><StatusBadge status={data.status} />
              </div>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between"><dt className="text-muted">Client</dt><dd className="text-foreground">{data.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Contact</dt><dd className="text-foreground">{data.email} · {data.phone}</dd></div>
                <div className="flex justify-between gap-6"><dt className="text-muted">Address</dt><dd className="text-right text-foreground">{data.location}</dd></div>
                {data.propertyType && <div className="flex justify-between"><dt className="text-muted">Property</dt><dd className="text-foreground">{data.propertyType}{data.size ? ` · ${data.size}` : ""}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">When</dt><dd className="text-foreground">{formatDate(data.date)} · {data.time}</dd></div>
                {data.details && <div className="flex justify-between gap-6"><dt className="text-muted">Details</dt><dd className="text-right text-foreground">{data.details}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Assignee</dt><dd className="text-foreground">{data.assignee ?? "Unassigned"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Booking type</dt><dd className="text-foreground">{data.kind === "cleaning" ? "Cleaning service" : "Home & lifestyle service"}</dd></div>
                {data.customerId && <div className="flex justify-between"><dt className="text-muted">Customer ID</dt><dd className="font-mono text-caption text-foreground">{data.customerId}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Date created</dt><dd className="text-foreground">{formatDate(data.createdAt)}</dd></div>
              </dl>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Payment</p>
                <dl className="space-y-1.5 text-body">
                  <div className="flex items-center justify-between"><dt className="text-muted">Payment status</dt><dd><StatusBadge status={data.paymentStatus ?? "pending"} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="text-foreground">{data.amount != null ? formatUGX(data.amount) : "Pending assessment"}</dd></div>
                  {data.paymentMethod && <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="capitalize text-foreground">{data.paymentMethod.replace(/_/g, " ")}</dd></div>}
                  {data.paymentReference && <div className="flex justify-between"><dt className="text-muted">Transaction ref</dt><dd className="font-mono text-caption text-foreground">{data.paymentReference}</dd></div>}
                </dl>
              </div>
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Assign staff</p>
                <div className="flex gap-2">
                  <select className={selectClass} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
                    <option value="">Select…</option>
                    {TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" disabled={busy || !assignee} onClick={assign}>Assign</Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Change status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.map((a) => (
                    <Button key={a.status} size="sm" variant={a.status === "cancelled" ? "outline" : "secondary"} disabled={busy || data.status === a.status} onClick={() => setStatus(a.status)}>{a.label}</Button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUSES = ["all", "new", "assigned", "in_progress", "completed", "cancelled"];

export default function ServiceBookingsPage() {
  const [kind, setKind] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [q, setQ] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listServiceBookings(scope), [scope]);

  const rows = React.useMemo(() => {
    let r = data ?? [];
    if (kind !== "all") r = r.filter((s) => s.kind === kind);
    if (status !== "all") r = r.filter((s) => s.status === status);
    if (from) r = r.filter((s) => s.date >= from);
    if (to) r = r.filter((s) => s.date <= to + "T23:59:59.999Z");
    if (q) { const t = q.toLowerCase(); r = r.filter((s) => s.reference.toLowerCase().includes(t) || s.name.toLowerCase().includes(t) || s.category.toLowerCase().includes(t)); }
    return [...r].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data, kind, status, from, to, q]);

  const columns: Column<ServiceBooking>[] = [
    { key: "reference", header: "Reference", sortable: true, render: (s) => <span className="font-medium text-foreground">{s.reference}</span> },
    { key: "name", header: "Client", sortable: true, render: (s) => <div><p className="font-medium text-foreground">{s.name}</p><p className="text-caption text-muted">{s.phone}</p></div> },
    { key: "kind", header: "Service", render: (s) => <Badge variant="muted">{s.kind === "cleaning" ? "Cleaning" : "Lifestyle"}</Badge> },
    { key: "category", header: "Category", sortable: true, render: (s) => s.category },
    { key: "date", header: "Date / time", sortable: true, render: (s) => <span className="text-body">{formatDate(s.date)} · {s.time}</span> },
    { key: "assignee", header: "Assignee", render: (s) => s.assignee ?? <span className="text-muted">Unassigned</span> },
    { key: "status", header: "Status", sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    { key: "location", header: "Address", render: (s) => <span className="text-caption text-muted">{s.location}</span> },
  ];

  return (
    <div>
      <PageHeader title="Service Bookings" subtitle="Cleaning and Home & Lifestyle service requests from the marketing site"
        actions={<ExportCsvButton data={rows} filename="service-bookings" columns={[
          { header: "Reference", accessor: (s) => s.reference },
          { header: "Client", accessor: (s) => s.name },
          { header: "Phone", accessor: (s) => s.phone },
          { header: "Service", accessor: (s) => s.kind },
          { header: "Category", accessor: (s) => s.category },
          { header: "Date", accessor: (s) => s.date.slice(0, 10) },
          { header: "Assignee", accessor: (s) => s.assignee ?? "" },
          { header: "Status", accessor: (s) => s.status },
          { header: "Location", accessor: (s) => s.location },
        ]} />} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search service bookings" className="h-10 pl-10" />
        </div>
        <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Service type">
          <option value="all">All services</option>
          <option value="cleaning">Cleaning</option>
          <option value="lifestyle">Home & Lifestyle</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</option>)}
        </select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-10" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-10" />
      </div>

      <DataTable
        columns={columns} data={rows} getRowId={(s) => s.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(s) => setDetailId(s.id)}
        emptyTitle="No service bookings" emptyDescription="Cleaning and lifestyle bookings will appear here." pageSize={12}
      />

      <DetailDialog id={detailId} onOpenChange={(o) => !o && setDetailId(null)} onDone={reload} />
    </div>
  );
}
