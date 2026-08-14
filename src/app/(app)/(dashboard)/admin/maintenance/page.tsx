"use client";

import * as React from "react";
import { Grid, ClipboardList, MapPin, UserCircle, Plus, PenNib, TrashBin, CheckCircle } from "flowbite-react-icons/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
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
  listTickets, createTicket, updateTicket, closeTicket, deleteTicket, propertyName, unitLabel, tenantName, propertyOptions, unitOptions, staffOptions,
  type MaintenanceTicket, type TicketStatus, type TicketCategory, type TicketPriority, type Scope,
} from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
  { status: "closed", label: "Closed" },
];
const TICKET_CATS: TicketCategory[] = ["plumbing", "electrical", "hvac", "appliance", "structural", "cleaning", "security", "other"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const createSchema = z.object({
  unitId: z.string().min(1, "Choose a unit"),
  title: z.string().min(3, "Enter a title"),
  description: z.string().min(5, "Describe the issue"),
  category: z.string().min(1),
  priority: z.string().min(1),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateTicketDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const units = React.useMemo(() => unitOptions(), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema), defaultValues: { unitId: "", title: "", description: "", category: "plumbing", priority: "medium" },
  });
  React.useEffect(() => { if (open) reset({ unitId: "", title: "", description: "", category: "plumbing", priority: "medium" }); }, [open, reset]);
  const onSubmit = async (v: CreateValues) => {
    try {
      await createTicket({ unitId: v.unitId, title: v.title, description: v.description, category: v.category as TicketCategory, priority: v.priority as TicketPriority });
      toast.success("Ticket created", { description: v.title });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t create ticket"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a ticket</DialogTitle><DialogDescription>Log a maintenance issue for a unit.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Unit" htmlFor="ct-unit" error={errors.unitId?.message}>
            <select id="ct-unit" className={selectClass} {...register("unitId")} aria-invalid={!!errors.unitId}>
              <option value="">Select…</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Title" htmlFor="ct-title" error={errors.title?.message}><Input id="ct-title" {...register("title")} aria-invalid={!!errors.title} /></Field>
          <Field label="Description" htmlFor="ct-desc" error={errors.description?.message}>
            <textarea id="ct-desc" rows={3} className={`${selectClass} h-auto py-2`} {...register("description")} aria-invalid={!!errors.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="ct-cat"><select id="ct-cat" className={`${selectClass} capitalize`} {...register("category")}>{TICKET_CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Priority" htmlFor="ct-pri"><select id="ct-pri" className={`${selectClass} capitalize`} {...register("priority")}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Create ticket</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketCard({ t, onClick }: { t: MaintenanceTicket; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-lg border border-border bg-surface-elevated p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
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
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<MaintenanceTicket | null>(null);
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
    {
      key: "actions", header: "", align: "right",
      render: (t) => (
        <RowActions actions={[
          { label: "Update", icon: <PenNib size={16} />, onClick: () => setSelected(t) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(t), danger: true, separatorBefore: true },
        ]} />
      ),
    },
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
      <PageHeader title="Maintenance" subtitle="Track and resolve maintenance tickets"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton data={data ?? []} filename="maintenance-tickets" columns={[
              { header: "Ref", accessor: (t) => t.ref },
              { header: "Title", accessor: (t) => t.title },
              { header: "Property", accessor: (t) => propertyName(t.propertyId) },
              { header: "Category", accessor: (t) => t.category },
              { header: "Priority", accessor: (t) => t.priority },
              { header: "Status", accessor: (t) => t.status },
              { header: "Assignee", accessor: (t) => t.assignee ?? "" },
              { header: "Cost", accessor: (t) => t.cost ?? "" },
            ]} />
            <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={18} /> Create ticket</Button>
          </div>
        } />
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

      <TicketDialog ticket={selected} onClose={() => setSelected(null)} onSaved={reload} onDelete={(t) => { setSelected(null); setDeleting(t); }} />
      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="ticket" entityName={deleting?.ref ?? ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteTicket(deleting.id); toast.success("Ticket deleted"); reload(); } catch { toast.error("Couldn’t delete ticket"); } }} />
    </div>
  );
}

function TicketDialog({ ticket, onClose, onSaved, onDelete }: { ticket: MaintenanceTicket | null; onClose: () => void; onSaved: () => void; onDelete: (t: MaintenanceTicket) => void }) {
  const [status, setStatus] = React.useState<TicketStatus>("open");
  const [assignee, setAssignee] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [resolution, setResolution] = React.useState("");
  const [busy, setBusy] = React.useState<null | "save" | "close">(null);

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignee(ticket.assignee ?? "");
      setCost(ticket.cost ? String(ticket.cost) : "");
      setResolution(ticket.resolution ?? "");
    }
  }, [ticket]);

  const save = async () => {
    if (!ticket) return;
    setBusy("save");
    try {
      await updateTicket(ticket.id, { status, assignee, cost: cost ? Number(cost) : undefined });
      toast.success("Ticket updated", { description: `${ticket.ref} → ${status.replace("_", " ")}.` });
      onSaved(); onClose();
    } catch { toast.error("Couldn’t update ticket"); }
    finally { setBusy(null); }
  };

  const close = async () => {
    if (!ticket) return;
    if (!resolution.trim()) { toast.error("Resolution required", { description: "Add a resolution summary to close the ticket." }); return; }
    setBusy("close");
    try {
      await closeTicket(ticket.id, resolution.trim());
      toast.success("Ticket closed", { description: `${ticket.ref} resolved.` });
      onSaved(); onClose();
    } catch { toast.error("Couldn’t close ticket"); }
    finally { setBusy(null); }
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
                  {staffOptions().map((s) => <option key={s.id} value={s.name}>{s.name}{s.availability !== "available" ? ` (${s.availability})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Cost (UGX)" htmlFor="tk-cost">
                <Input id="tk-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <Field label="Resolution summary (required to close)" htmlFor="tk-res">
              <textarea id="tk-res" rows={2} className={`${selectClass} h-auto py-2`} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was done to resolve it…" />
            </Field>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" className="gap-2 text-primary" onClick={() => onDelete(ticket)}><TrashBin size={16} /> Delete</Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="gap-2" onClick={close} loading={busy === "close"} disabled={ticket.status === "closed"}><CheckCircle size={16} /> Close ticket</Button>
                <Button onClick={save} loading={busy === "save"}>Save changes</Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
