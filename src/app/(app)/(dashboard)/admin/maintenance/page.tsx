"use client";

import * as React from "react";
import { Grid, ClipboardList, MapPin, UserCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import {
  listTickets, updateTicket, propertyName, unitLabel, tenantName, propertyOptions,
  type MaintenanceTicket, type TicketStatus, type Scope,
} from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
  { status: "closed", label: "Closed" },
];
const TECHS = ["James Odoi", "Fred Wanyama", "Peter Ssemakula", "Alex Mugume"];

function TicketCard({ t, onClick }: { t: MaintenanceTicket; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-lg border border-border bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-muted">{t.ref}</span>
        <PriorityBadge priority={t.priority} />
      </div>
      <p className="mt-1.5 text-body font-medium text-foreground">{t.title}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-caption text-muted"><MapPin size={13} /> {propertyName(t.propertyId)} · {unitLabel(t.unitId)}</p>
      {t.assignee && <p className="mt-1 inline-flex items-center gap-1 text-caption text-muted"><UserCircle size={13} /> {t.assignee}</p>}
    </button>
  );
}

export default function MaintenancePage() {
  const [view, setView] = React.useState<"board" | "table">("board");
  const [property, setProperty] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [selected, setSelected] = React.useState<MaintenanceTicket | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const options = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(
    () => listTickets({ propertyId: property, priority }, scope),
    [property, priority, scope],
  );

  const tickets = data ?? [];

  const columns: Column<MaintenanceTicket>[] = [
    { key: "ref", header: "Ref", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.ref}</span> },
    { key: "title", header: "Issue", render: (t) => t.title },
    { key: "propertyId", header: "Property", sortValue: (t) => propertyName(t.propertyId), render: (t) => propertyName(t.propertyId) },
    { key: "unitId", header: "Unit", render: (t) => unitLabel(t.unitId) },
    { key: "priority", header: "Priority", sortable: true, render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: "assignee", header: "Technician", render: (t) => t.assignee ?? <span className="text-muted">Unassigned</span> },
    { key: "cost", header: "Cost", align: "right", render: (t) => (t.cost ? formatUGX(t.cost) : "—") },
  ];

  const filters = (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="inline-flex rounded-md border border-border p-0.5">
        <button type="button" onClick={() => setView("board")}
          className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-medium transition-colors", view === "board" ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
          <Grid size={16} /> Board
        </button>
        <button type="button" onClick={() => setView("table")}
          className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-medium transition-colors", view === "table" ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
          <ClipboardList size={16} /> Table
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
        <select className={`${selectClass} sm:w-52`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={`${selectClass} sm:w-40`} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Track and resolve maintenance tickets" />
      {filters}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn’t load tickets" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = tickets.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="rounded-lg bg-surface-hover/50 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-heading text-body font-semibold text-foreground">{col.label}</h3>
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-caption font-medium text-muted">{items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-caption text-muted">No tickets</p>
                  ) : (
                    items.map((t) => <TicketCard key={t.id} t={t} onClick={() => setSelected(t)} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable columns={columns} data={tickets} getRowId={(t) => t.id} onRowClick={(t) => setSelected(t)}
          emptyTitle="No tickets" emptyDescription="Maintenance tickets will appear here." pageSize={10} />
      )}

      <TicketDialog ticket={selected} onClose={() => setSelected(null)} onSaved={reload} />
    </div>
  );
}

function TicketDialog({ ticket, onClose, onSaved }: { ticket: MaintenanceTicket | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = React.useState<TicketStatus>("open");
  const [assignee, setAssignee] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignee(ticket.assignee ?? "");
      setCost(ticket.cost ? String(ticket.cost) : "");
    }
  }, [ticket]);

  const save = async () => {
    if (!ticket) return;
    setBusy(true);
    try {
      await updateTicket(ticket.id, { status, assignee, cost: cost ? Number(cost) : undefined });
      toast.success("Ticket updated", { description: `${ticket.ref} → ${status.replace("_", " ")}.` });
      onSaved(); onClose();
    } catch { toast.error("Couldn’t update ticket"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {ticket && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{ticket.ref}</DialogTitle>
                <PriorityBadge priority={ticket.priority} />
              </div>
              <DialogDescription>{ticket.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1 text-caption text-muted">
              <p className="inline-flex items-center gap-1.5"><MapPin size={14} /> {propertyName(ticket.propertyId)} · {unitLabel(ticket.unitId)}</p>
              {ticket.tenantId && <p className="inline-flex items-center gap-1.5"><UserCircle size={14} /> {tenantName(ticket.tenantId)}</p>}
              <p>Raised {formatDate(ticket.createdAt)}</p>
            </div>
            <p className="text-body text-muted">{ticket.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" htmlFor="tk-status">
                <select id="tk-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
                  {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Technician" htmlFor="tk-tech">
                <select id="tk-tech" className={selectClass} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Cost (UGX)" htmlFor="tk-cost">
                <Input id="tk-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={save} loading={busy}>Save changes</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
