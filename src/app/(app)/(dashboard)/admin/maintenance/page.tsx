"use client";

import * as React from "react";
import Link from "next/link";
import { Grid, ClipboardList, MapPin, UserCircle, Plus, PenNib, TrashBin, CheckCircle, FileLines, CashRegister, ChartMixed, ExclamationCircle } from "flowbite-react-icons/outline";
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
import { assignmentOptions, assignmentLabel } from "@/lib/api/assignment";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  listTickets, createTicket, updateTicket, deleteTicket, propertyName, unitLabel, tenantName, propertyOptions, unitOptions, ownerNameFor,
  type MaintenanceTicket, type TicketStatus, type TicketCategory, type TicketPriority, type Scope,
} from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import { CloseTicketDialog } from "@/components/admin/close-ticket-dialog";
import { LiabilityBadge } from "@/components/admin/liability-badge";
import { payMaintenanceCharge, getMaintenanceSummary, LIABILITY_LABEL, billedToTenant } from "@/lib/api/maintenance-liability";
import { maintenanceInvoicePdf } from "@/lib/pdf/builders";
import { downloadPdf } from "@/lib/pdf/download";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/motion/count-up";
import type { TicketLiability, TicketPaymentStatus } from "@/lib/mock/types";
import { AssessmentDialog, RouteChargeDialog } from "@/components/admin/maintenance-routing-dialogs";
import {
  TICKET_STATUS_LABEL, canTransitionTicket, ticketTransitionHint,
  waitingLabel, hoursAwaiting, sendApprovalReminder,
} from "@/lib/api/maintenance-routing";
import { CurrencyCode } from "@/components/app/currency-code";

/**
 * Board columns (F3). The three routing branches share one "Awaiting" column —
 * nine narrow columns would be unreadable, and what a manager needs to see is
 * simply "this is blocked on somebody", not which flavour of blocked.
 */
const BOARD_COLUMNS: { label: string; statuses: TicketStatus[] }[] = [
  { label: "Open", statuses: ["open"] },
  { label: "Assigned", statuses: ["assigned"] },
  { label: "Assessed", statuses: ["assessed"] },
  { label: "Awaiting approval / payment", statuses: ["awaiting_owner_approval", "awaiting_tenant_payment"] },
  { label: "Scheduled", statuses: ["owner_approved", "scheduled"] },
  { label: "In progress", statuses: ["in_progress"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "Closed", statuses: ["closed", "owner_declined"] },
];

/** Every status, for the filter and the detail-dialog select. */
const ALL_TICKET_STATUSES = Object.keys(TICKET_STATUS_LABEL) as TicketStatus[];

/** Which owner an approval is waiting on. */
const ownerNameForProperty = (propertyId: string) => ownerNameFor(propertyId);
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
      {t.status === "awaiting_owner_approval" && (
        <p className={cn("mt-1 text-caption", hoursAwaiting(t) >= 48 ? "font-medium text-primary" : "text-muted")}>
          Awaiting owner approval — {waitingLabel(t)}
        </p>
      )}
      {/* Closed cards carry the outcome the PM asked for: who paid, and whether they have. */}
      {(t.liability || t.chargeTo) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
          <LiabilityBadge liability={t.liability ?? t.chargeTo} />
          <span className="text-caption text-muted">{formatCurrency(t.cost ?? 0, t.currency)}</span>
          {t.paymentStatus === "awaiting_payment" && <span className="text-caption font-medium text-primary">· Awaiting payment</span>}
        </div>
      )}
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
  // E4 — liability lens over the same ticket list.
  const [liability, setLiability] = React.useState<"all" | TicketLiability>("all");
  const [payment, setPayment] = React.useState<"all" | TicketPaymentStatus>("all");
  const [closing, setClosing] = React.useState<{ ticket: MaintenanceTicket; resolution: string } | null>(null);
  const [paying, setPaying] = React.useState<MaintenanceTicket | null>(null);
  /* F3 — assessment and routing, the two steps that now sit before any work. */
  const [assessing, setAssessing] = React.useState<MaintenanceTicket | null>(null);
  const [routing, setRouting] = React.useState<MaintenanceTicket | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const options = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(
    () => listTickets({ propertyId: property, priority }, scope),
    [property, priority, scope],
  );

  const tickets = (data ?? []).filter(
    (t) => (liability === "all" || (t.liability ?? t.chargeTo) === liability) && (payment === "all" || t.paymentStatus === payment),
  );
  const summary = React.useMemo(() => getMaintenanceSummary(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link from the finance ledger (?ticket=…) — clicking a maintenance
  // number there lands on the ticket that produced it.
  // Read from location rather than useSearchParams so the page needs no Suspense
  // boundary — this only ever runs in the browser.
  React.useEffect(() => {
    if (!data) return;
    const id = new URLSearchParams(window.location.search).get("ticket");
    if (!id) return;
    const t = data.find((x) => x.id === id);
    if (t) setSelected(t);
  }, [data]);

  const columns: Column<MaintenanceTicket>[] = [
    { key: "ref", header: "Ref", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.ref}</span> },
    { key: "title", header: "Issue", render: (t) => t.title },
    { key: "propertyId", header: "Property", sortValue: (t) => propertyName(t.propertyId), render: (t) => propertyName(t.propertyId) },
    { key: "unitId", header: "Unit", render: (t) => unitLabel(t.unitId) },
    { key: "priority", header: "Priority", sortable: true, render: (t) => <PriorityBadge priority={t.priority} /> },
    {
      key: "status", header: "Status", sortable: true,
      render: (t) => (
        <span>
          <StatusBadge status={t.status} />
          {/* F3 — a manager needs to see at a glance who is being waited on and
              for how long; past 48 hours it stops being normal and starts needing a chase. */}
          {t.status === "awaiting_owner_approval" && (
            <span className={cn("mt-0.5 block text-caption", hoursAwaiting(t) >= 48 ? "font-medium text-primary" : "text-muted")}>
              {ownerNameFor(t.propertyId)} — {waitingLabel(t)}{hoursAwaiting(t) >= 48 ? " · chase" : ""}
            </span>
          )}
        </span>
      ),
    },
    { key: "assignee", header: "Technician", render: (t) => t.assignee ?? <span className="text-muted">Unassigned</span> },
    { key: "cost", header: "Cost", align: "right", render: (t) => (t.cost ? formatCurrency(t.cost, t.currency) : "—") },
    { key: "liability", header: "Liability", sortable: true, sortValue: (t) => t.liability ?? t.chargeTo ?? "", render: (t) => <LiabilityBadge liability={t.liability ?? t.chargeTo} /> },
    {
      key: "paymentStatus", header: "Payment", sortable: true, sortValue: (t) => t.paymentStatus ?? "",
      render: (t) =>
        t.paymentStatus === "paid" ? <StatusBadge status="paid" />
          : t.paymentStatus === "awaiting_payment" ? <StatusBadge status="awaiting_payment" />
            : <span className="text-muted">—</span>,
    },
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
        <select className={`${selectClass} sm:w-40`} value={liability} onChange={(e) => setLiability(e.target.value as typeof liability)} aria-label="Filter by liability">
          <option value="all">All liability</option>
          <option value="owner">Owner-liable</option>
          <option value="tenant">Tenant-liable</option>
          <option value="nexora">Nexora-absorbed</option>
        </select>
        <select className={`${selectClass} sm:w-44`} value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)} aria-label="Filter by payment status">
          <option value="all">All payment states</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="paid">Paid</option>
          <option value="not_applicable">Not applicable</option>
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
              { header: "Liability", accessor: (t) => { const p = t.liability ?? t.chargeTo; return p ? LIABILITY_LABEL[p] : ""; } },
              { header: "Liability reason", accessor: (t) => t.liabilityReason ?? "" },
              { header: "Invoice", accessor: (t) => t.invoiceNumber ?? "" },
              { header: "Payment status", accessor: (t) => t.paymentStatus ?? "" },
            ]} />
            <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={18} /> Create ticket</Button>
          </div>
        } />
      {/* E4 — where the maintenance money actually lands. */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total maintenance cost" icon={<ChartMixed size={20} />}
          value={<CountUp to={summary.totalCost} prefix="UGX " immediate />}
          hint={`${summary.owner.count + summary.tenant.count + summary.nexora.count} costed tickets`} />
        <StatCard label="Owner-liable" icon={<UserCircle size={20} />}
          value={<CountUp to={summary.owner.amount} prefix="UGX " immediate />}
          hint={`${summary.owner.count} tickets · deducted from settlements`} />
        <StatCard label="Tenant-liable" icon={<FileLines size={20} />}
          value={<CountUp to={summary.tenant.amount} prefix="UGX " immediate />}
          hint={`${summary.tenant.count} tickets · ${summary.tenant.awaiting} awaiting payment`} />
        <StatCard label="Nexora-absorbed" icon={<CashRegister size={20} />}
          value={<CountUp to={summary.nexora.amount} prefix="UGX " immediate />}
          hint={`${summary.nexora.count} tickets · not charged to owners`} />
      </div>

      {filters}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn’t load tickets" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {BOARD_COLUMNS.map((col) => {
            const items = tickets.filter((t) => col.statuses.includes(t.status));
            return (
              <div key={col.label} className="rounded-lg bg-surface-hover/50 p-3">
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

      <TicketDialog ticket={selected} onClose={() => setSelected(null)} onSaved={reload}
        onDelete={(t) => { setSelected(null); setDeleting(t); }}
        onClose2={(t, res) => { setSelected(null); setClosing({ ticket: t, resolution: res }); }}
        onRecordPayment={(t) => { setSelected(null); setPaying(t); }}
        onAssess={(t) => { setSelected(null); setAssessing(t); }}
        onRoute={(t) => { setSelected(null); setRouting(t); }} />
      <CloseTicketDialog ticket={closing?.ticket ?? null} resolution={closing?.resolution ?? ""}
        onOpenChange={(o) => !o && setClosing(null)} onDone={reload} />
      <AssessmentDialog ticket={assessing} onOpenChange={(o) => !o && setAssessing(null)} onDone={reload} />
      <RouteChargeDialog ticket={routing} onOpenChange={(o) => !o && setRouting(null)} onDone={reload} />
      <RecordMaintenancePaymentDialog ticket={paying} onOpenChange={(o) => !o && setPaying(null)} onDone={reload} />
      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="ticket" entityName={deleting?.ref ?? ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteTicket(deleting.id); toast.success("Ticket deleted"); reload(); } catch { toast.error("Couldn’t delete ticket"); } }} />
    </div>
  );
}

function TicketDialog({ ticket, onClose, onSaved, onDelete, onClose2, onRecordPayment, onAssess, onRoute }: {
  ticket: MaintenanceTicket | null; onClose: () => void; onSaved: () => void; onDelete: (t: MaintenanceTicket) => void;
  /** Hands off to the liability dialog — closing a ticket now needs a payer. */
  onClose2: (t: MaintenanceTicket, resolution: string) => void;
  onRecordPayment: (t: MaintenanceTicket) => void;
  /** F3 — the two pre-work steps. */
  onAssess: (t: MaintenanceTicket) => void;
  onRoute: (t: MaintenanceTicket) => void;
}) {
  const [status, setStatus] = React.useState<TicketStatus>("open");
  const [assignee, setAssignee] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [resolution, setResolution] = React.useState("");
  const [busy, setBusy] = React.useState<null | "save" | "close">(null);

  /* F4.4 — scheduling awareness. The target moment is the ticket's own
     updatedAt: for maintenance that is when the visit is pencilled in. */
  const assignOptions = React.useMemo(
    () => assignmentOptions({ departments: ["maintenance"], roles: ["maintenance_officer"] }, ticket?.updatedAt ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticket?.updatedAt, ticket?.id],
  );
  const selectedAssignOption = assignOptions.find((o) => o.name === assignee) ?? null;
  const [confirmClash, setConfirmClash] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignee(ticket.assignee ?? "");
      setCost(ticket.cost ? String(ticket.cost) : "");
      setResolution(ticket.resolution ?? "");
    }
  }, [ticket]);

  const doSave = async () => {
    if (!ticket) return;
    setBusy("save");
    try {
      await updateTicket(ticket.id, { status, assignee, cost: cost ? Number(cost) : undefined });
      toast.success("Ticket updated", { description: `${ticket.ref} → ${status.replace("_", " ")}.` });
      onSaved(); onClose();
    } catch { toast.error("Couldn’t update ticket"); }
    finally { setBusy(null); setConfirmClash(false); }
  };
  /* F4.4 — an admin may double-book, but has to mean it. Only prompts when the
     assignee is CHANGING into a clash, not on every save of an existing one. */
  const save = async () => {
    const changingAssignee = !!assignee && assignee !== (ticket?.assignee ?? "");
    if (changingAssignee && selectedAssignOption?.conflict) { setConfirmClash(true); return; }
    await doSave();
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
                  {ALL_TICKET_STATUSES.map((st) => {
                    const allowed = st === ticket.status || canTransitionTicket(ticket.status, st);
                    return (
                      <option key={st} value={st} disabled={!allowed}
                        title={allowed ? undefined : ticketTransitionHint(ticket.status, st)}>
                        {TICKET_STATUS_LABEL[st]}{st === ticket.status ? " (current)" : allowed ? "" : " — unavailable"}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="Technician" htmlFor="tk-tech">
                <select id="tk-tech" className={selectClass} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {assignOptions.map((s) => (
                    <option key={s.id} value={s.name} title={s.warning || undefined}>
                      {assignmentLabel(s)}{s.unavailable ? " · away" : ""}
                    </option>
                  ))}
                </select>
                {/* F4.4 — what the office could not see before: is this person free? */}
                {selectedAssignOption?.warning && (
                  <p
                    key={`warn-${selectedAssignOption.id}`}
                    className="mt-1.5 inline-flex items-start gap-1.5 text-caption font-medium text-primary motion-safe:animate-in motion-safe:fade-in"
                  >
                    <ExclamationCircle size={14} className="mt-0.5 shrink-0" />
                    {selectedAssignOption.warning}
                  </p>
                )}
              </Field>
              <Field label={<>Cost (<CurrencyCode />)</>} htmlFor="tk-cost">
                <Input id="tk-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <Field label="Resolution summary (required to close)" htmlFor="tk-res">
              <textarea id="tk-res" rows={2} className={`${selectClass} h-auto py-2`} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was done to resolve it…" />
            </Field>

            {/* F3 — the pre-work assessment, permanently visible. */}
            {ticket.assessedCost != null && (
              <div className="rounded-xl border border-border p-4">
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Assessment</p>
                <dl className="space-y-1.5 text-body">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Estimated labour · materials</dt><dd className="text-foreground">{formatCurrency(ticket.assessedLabour ?? 0, ticket.currency)} · {formatCurrency(ticket.assessedMaterials ?? 0, ticket.currency)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Estimated total</dt><dd className="font-medium text-foreground">{formatCurrency(ticket.assessedCost, ticket.currency)}</dd></div>
                  {ticket.assessedAt && <div className="flex justify-between gap-4"><dt className="text-muted">Assessed</dt><dd className="text-foreground">{formatDate(ticket.assessedAt)}</dd></div>}
                  {ticket.assessmentNotes && <div className="gap-4"><dt className="text-muted">Notes</dt><dd className="mt-0.5 text-foreground">{ticket.assessmentNotes}</dd></div>}
                </dl>
                {ticket.chargeTo && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-caption text-muted">Routed to</span>
                      <span className="flex items-center gap-1.5">
                        <LiabilityBadge liability={ticket.chargeTo} />
                        {ticket.routingOverridden && <Badge className="border-accent/40 bg-surface-active text-foreground">Override</Badge>}
                      </span>
                    </div>
                    <p className="mt-1 text-caption text-muted">{ticket.chargeToReason}</p>
                    {ticket.routingOverrideReason && (
                      <p className="mt-1 text-caption text-muted"><span className="text-foreground">Override:</span> {ticket.routingOverrideReason}</p>
                    )}
                  </div>
                )}
                {ticket.status === "awaiting_owner_approval" && (
                  <div className="mt-3 rounded-lg border border-accent/40 bg-surface-hover p-3">
                    <p className="text-caption font-medium text-foreground">
                      Awaiting owner approval — {waitingLabel(ticket)}
                      {hoursAwaiting(ticket) >= 48 ? " · needs chasing" : ""}
                    </p>
                    <p className="mt-0.5 text-caption text-muted">
                      Waiting on {ownerNameForProperty(ticket.propertyId)}.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2"
                      onClick={async () => {
                        try { await sendApprovalReminder(ticket.id, "Admin"); toast.success("Reminder sent to the owner"); onSaved(); }
                        catch { toast.error("Couldn’t send the reminder"); }
                      }}>
                      Send Reminder
                    </Button>
                  </div>
                )}
                {ticket.ownerApprovalStatus === "declined" && ticket.ownerDeclineReason && (
                  <p className="mt-3 rounded-lg bg-surface-hover p-3 text-caption text-muted">
                    <span className="text-foreground">Owner declined:</span> {ticket.ownerDeclineReason}
                  </p>
                )}
              </div>
            )}

            {/* F3 — the single action that moves this ticket forward. */}
            {(ticket.status === "assigned" || ticket.status === "assessed") && (
              <Button className="w-full" onClick={() => (ticket.status === "assigned" ? onAssess(ticket) : onRoute(ticket))}>
                {ticket.status === "assigned" ? "Record Assessment" : "Route Charge — who pays?"}
              </Button>
            )}

            {/* E4 — who paid, and where the money went. Permanently visible so the
                rationale stays auditable long after the ticket was closed. */}
            {(ticket.liability || ticket.chargeTo) && (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-caption font-medium uppercase tracking-wide text-muted">Cost liability</p>
                  <LiabilityBadge liability={ticket.liability ?? ticket.chargeTo} />
                </div>
                <dl className="space-y-1.5 text-body">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Labour · materials</dt><dd className="text-foreground">{formatCurrency(ticket.labourCost ?? 0)} · {formatCurrency(ticket.materialsCost ?? 0)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Total</dt><dd className="font-medium text-foreground">{formatCurrency(ticket.cost ?? 0, ticket.currency)}</dd></div>
                  {ticket.assessedCost != null && ticket.costVariance != null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Assessed vs actual</dt>
                      <dd className="text-foreground">
                        {formatCurrency(ticket.assessedCost, ticket.currency)} → {formatCurrency(ticket.actualCost ?? ticket.cost ?? 0, ticket.currency)}
                        <span className="ml-1 text-muted">({ticket.costVariance >= 0 ? "+" : "−"}{formatCurrency(Math.abs(ticket.costVariance))})</span>
                      </dd>
                    </div>
                  )}
                  {ticket.liabilityChangeReason && (
                    <div className="gap-4"><dt className="text-muted">Payer changed at closure</dt><dd className="mt-0.5 text-foreground">{ticket.liabilityChangeReason}</dd></div>
                  )}
                  <div className="gap-4"><dt className="text-muted">Reason</dt><dd className="mt-0.5 text-foreground">{ticket.liabilityReason}</dd></div>
                </dl>

                {billedToTenant(ticket) && ticket.invoiceNumber ? (
                  <div className="mt-3 rounded-lg bg-surface-hover p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-medium text-foreground">{ticket.invoiceNumber}</span>
                      <StatusBadge status={ticket.paymentStatus === "paid" ? "paid" : "awaiting_payment"} />
                    </div>
                    <dl className="space-y-1 text-caption">
                      <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="text-foreground">{formatCurrency(ticket.invoiceAmount ?? 0, ticket.currency)}</dd></div>
                      {ticket.invoiceGeneratedAt && <div className="flex justify-between"><dt className="text-muted">Issued</dt><dd className="text-foreground">{formatDate(ticket.invoiceGeneratedAt)}</dd></div>}
                      {ticket.invoiceDueDate && <div className="flex justify-between"><dt className="text-muted">Due</dt><dd className="text-foreground">{formatDate(ticket.invoiceDueDate)}</dd></div>}
                      {ticket.paymentReference && <div className="flex justify-between"><dt className="text-muted">Payment ref</dt><dd className="font-mono text-foreground">{ticket.paymentReference}</dd></div>}
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { const { payload, filename } = maintenanceInvoicePdf(ticket.id); downloadPdf(payload, filename); }}>
                        <FileLines size={15} /> View Invoice
                      </Button>
                      {ticket.paymentStatus === "awaiting_payment" && (
                        <Button size="sm" variant="secondary" onClick={() => onRecordPayment(ticket)}>Record Manual Payment</Button>
                      )}
                    </div>
                  </div>
                ) : ticket.expenseId ? (
                  <div className="mt-3 rounded-lg bg-surface-hover p-3 text-caption">
                    <p className="font-medium text-foreground">
                      Recorded as {ticket.liability === "owner" ? "Owner Property Expense" : "Nexora Operational Cost"}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {formatCurrency(ticket.cost ?? 0, ticket.currency)}{ticket.closedAt ? ` · ${formatDate(ticket.closedAt)}` : ""}
                      {ticket.liability === "nexora" ? " · not charged to any owner" : ""}
                    </p>
                    <Link href="/admin/finance" className="mt-1.5 inline-block font-medium text-primary hover:text-accent">View in Finance →</Link>
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" className="gap-2 text-primary" onClick={() => onDelete(ticket)}><TrashBin size={16} /> Delete</Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="gap-2" onClick={() => onClose2(ticket, resolution)} disabled={ticket.status === "closed"}><CheckCircle size={16} /> Close ticket</Button>
                <Button onClick={save} loading={busy === "save"}>Save changes</Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      {/* F4.4 — overriding a clash is allowed, but never by accident. */}
      <Dialog open={confirmClash} onOpenChange={setConfirmClash}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign anyway?</DialogTitle>
            <DialogDescription>{selectedAssignOption?.warning}</DialogDescription>
          </DialogHeader>
          {selectedAssignOption && selectedAssignOption.jobsOnDate.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
              {selectedAssignOption.jobsOnDate.map((j) => (
                <li key={j.ref}>{j.time ? `${j.time} · ` : ""}{j.ref} — {j.title}</li>
              ))}
            </ul>
          )}
          <p className="text-caption text-muted">
            Double-booking is sometimes the right call. This is a warning, not a block.
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Pick someone else</Button></DialogClose>
            <Button loading={busy === "save"} onClick={doSave}>Assign anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}

/**
 * Admin-side settlement of a tenant maintenance charge — for cash or a transfer
 * taken outside the tenant portal. Calls the same API the tenant flow does, so
 * the money lands in the same place either way.
 */
function RecordMaintenancePaymentDialog({ ticket, onOpenChange, onDone }: {
  ticket: MaintenanceTicket | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [method, setMethod] = React.useState("mobile_money");
  const [reference, setReference] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (ticket) { setMethod("mobile_money"); setReference(""); } }, [ticket]);

  const submit = async () => {
    if (!ticket) return;
    setBusy(true);
    try {
      const ref = reference.trim() || `MPY-${Date.now().toString().slice(-8)}`;
      await payMaintenanceCharge(ticket.id, { amount: ticket.invoiceAmount ?? ticket.cost ?? 0, method, reference: ref });
      toast.success("Payment recorded", { description: `${ticket.invoiceNumber} settled · ${ref}` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t record the payment"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent>
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>{ticket.invoiceNumber} · {tenantName(ticket.tenantId)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
                <span className="text-body font-medium text-foreground">Amount due</span>
                <span className="font-heading text-h3 font-semibold text-primary">{formatCurrency(ticket.invoiceAmount ?? ticket.cost ?? 0, ticket.currency)}</span>
              </div>
              <Field label="Payment method" htmlFor="mp-method">
                <select id="mp-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </Field>
              <Field label="Payment reference" htmlFor="mp-ref">
                <Input id="mp-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Leave blank to generate one" />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy}>Record payment</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
