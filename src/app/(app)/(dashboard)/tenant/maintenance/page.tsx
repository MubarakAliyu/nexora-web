"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdjustmentsHorizontal, Plus, CheckCircle, Clock, Image as ImageIcon, MessageDots, Download } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/forms/field";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatDate, fromNow, formatCurrency } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { maintenanceInvoicePdf } from "@/lib/pdf/builders";
import { billedToTenant } from "@/lib/api/maintenance-liability";
import { PayChargeDialog } from "@/components/tenant/pay-charge-dialog";
import { getTenant, createTicket, NOW_ISO, type MaintenanceTicket, type TicketCategory, type TicketPriority, type Scope } from "@/lib/api/admin";

type Tab = "maintenance" | "complaints";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "plumbing", label: "Plumbing" }, { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "Heating / Cooling" }, { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" }, { value: "security", label: "Security" },
  { value: "cleaning", label: "Cleaning" }, { value: "other", label: "Other" },
];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const STEPS: { key: string; label: string }[] = [
  { key: "open", label: "Submitted" },
  { key: "assigned", label: "Assigned to technician" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];
/**
 * F3 added statuses between "assigned" and work actually starting — assessment,
 * owner approval, tenant payment. None of them mean a technician has begun, so they
 * all rest on "Assigned to technician". Without them here they fell through to the
 * `?? 0` default and an assessed ticket still read "Submitted" to the tenant.
 */
const ORDER: Record<string, number> = {
  open: 0,
  assigned: 1, assessed: 1, awaiting_owner_approval: 1,
  awaiting_tenant_payment: 1, owner_approved: 1, scheduled: 1,
  in_progress: 2, completed: 3, closed: 3,
};

/**
 * A repair that was declined never happened. It reaches the tenant as `closed`,
 * which shared a slot with `completed` — so the tenant was shown "In progress: Done"
 * and "Completed" for work nobody ever did. It gets its own ending, worded without
 * saying why: the owner's reason is between Nexora and the owner.
 */
const NOT_PROCEEDING_STEPS: { key: string; label: string }[] = [
  { key: "open", label: "Submitted" },
  { key: "assigned", label: "Assigned to technician" },
  { key: "assessed", label: "Assessed" },
  { key: "not_proceeding", label: "Not proceeding at present" },
];

const isNotProceeding = (t: MaintenanceTicket) =>
  t.status === "owner_declined" || (t.status === "closed" && t.ownerApprovalStatus === "declined");

function TicketDetailDialog({ ticket, onOpenChange, onPay }: {
  ticket: MaintenanceTicket | null; onOpenChange: (o: boolean) => void; onPay: (t: MaintenanceTicket) => void;
}) {
  const stalled = !!ticket && isNotProceeding(ticket);
  const steps = stalled ? NOT_PROCEEDING_STEPS : STEPS;
  const current = ticket ? (stalled ? steps.length - 1 : ORDER[ticket.status] ?? 0) : 0;
  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{ticket.ref} <StatusBadge status={ticket.status} /></DialogTitle>
              <DialogDescription>{ticket.title}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between"><dt className="text-muted">Category</dt><dd className="capitalize text-foreground">{ticket.category}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Priority</dt><dd><PriorityBadge priority={ticket.priority} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Submitted</dt><dd className="text-foreground">{formatDate(ticket.createdAt)}</dd></div>
              {ticket.assignee && <div className="flex justify-between"><dt className="text-muted">Technician</dt><dd className="text-foreground">{ticket.assignee}</dd></div>}
            </dl>
            <p className="rounded-lg bg-surface-hover p-3 text-body text-muted">{ticket.description}</p>
            <div>
              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-muted">Status timeline</p>
              <Timeline>
                {steps.map((s, i) => (
                  <TimelineItem key={s.key} title={s.label} icon={i <= current ? <CheckCircle size={11} /> : <Clock size={11} />}
                    time={i === current ? fromNow(ticket.updatedAt, NOW_ISO) : ""}>
                    <span className={cn("text-caption", i <= current ? "text-primary" : "text-muted")}>{i < current ? "Done" : i === current ? "Current" : "Pending"}</span>
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
            {/* E4 — the charge, if this repair was found to be the tenant's. */}
            {billedToTenant(ticket) && ticket.invoiceNumber && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption font-medium uppercase tracking-wide text-muted">Maintenance charge</p>
                  <StatusBadge status={ticket.paymentStatus === "paid" ? "paid" : "awaiting_payment"} />
                </div>
                <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatCurrency(ticket.invoiceAmount ?? ticket.cost ?? 0, ticket.currency)}</p>
                <dl className="mt-2 space-y-1 text-caption">
                  <div className="flex justify-between"><dt className="text-muted">Invoice</dt><dd className="font-medium text-foreground">{ticket.invoiceNumber}</dd></div>
                  {ticket.invoiceDueDate && <div className="flex justify-between"><dt className="text-muted">Due</dt><dd className="text-foreground">{formatDate(ticket.invoiceDueDate)}</dd></div>}
                  <div className="flex justify-between gap-4"><dt className="shrink-0 text-muted">Reason</dt><dd className="text-right text-foreground">{ticket.liabilityReason}</dd></div>
                  {ticket.paymentReference && <div className="flex justify-between"><dt className="text-muted">Payment ref</dt><dd className="font-mono text-foreground">{ticket.paymentReference}</dd></div>}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ticket.paymentStatus === "awaiting_payment" && <Button size="sm" onClick={() => onPay(ticket)}>Pay charge</Button>}
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { const { payload, filename } = maintenanceInvoicePdf(ticket.id); downloadPdf(payload, filename); }}>
                    <Download size={15} /> {ticket.paymentStatus === "paid" ? "Receipt" : "Invoice"}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  title: z.string().min(4, "Describe the issue briefly"),
  category: z.string().min(1, "Choose a category"),
  priority: z.string().min(1),
  description: z.string().min(10, "Add a few details (10+ characters)"),
});
type Values = z.infer<typeof schema>;

export default function TenantMaintenancePage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const [tab, setTab] = React.useState<Tab>("maintenance");
  const [detail, setDetail] = React.useState<MaintenanceTicket | null>(null);
  const [payingCharge, setPayingCharge] = React.useState<MaintenanceTicket | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", priority: "medium", description: "" },
  });

  const isComplaint = tab === "complaints";

  const onSubmit = async (v: Values) => {
    if (!data?.unit) { toast.error("No unit on file"); return; }
    try {
      await createTicket({
        unitId: data.unit.id,
        title: isComplaint ? `Complaint: ${v.title}` : v.title,
        description: v.description,
        category: (isComplaint ? "other" : v.category) as TicketCategory,
        priority: v.priority as TicketPriority,
      });
      toast.success(isComplaint ? "Complaint submitted" : "Request submitted", { description: "Our team will review it shortly." });
      reset({ title: "", category: "", priority: "medium", description: "" });
      reload();
    } catch {
      toast.error("Couldn’t submit", { description: "Please try again." });
    }
  };

  if (loading && !data) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-64 w-full rounded-xl" /></div>;
  }
  if (error || !data) {
    return <EmptyState icon={<AdjustmentsHorizontal size={22} />} title="Couldn’t load requests" description={error ?? "Please try again."} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />;
  }

  const allTickets = data.tickets;
  const complaints = allTickets.filter((t) => t.title.startsWith("Complaint:"));
  const maintenance = allTickets.filter((t) => !t.title.startsWith("Complaint:"));
  const rows = isComplaint ? complaints : maintenance;

  const columns: Column<MaintenanceTicket>[] = [
    { key: "ref", header: "Ref", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.ref}</span> },
    { key: "title", header: "Subject", render: (t) => t.title.replace(/^Complaint:\s*/, "") },
    ...(!isComplaint ? [{ key: "category", header: "Category", render: (t: MaintenanceTicket) => <span className="capitalize">{t.category}</span> } as Column<MaintenanceTicket>] : []),
    { key: "priority", header: "Priority", render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: "createdAt", header: "Submitted", sortable: true, align: "right", render: (t) => formatDate(t.createdAt) },
    {
      key: "charge", header: "Charge", align: "right",
      render: (t) => billedToTenant(t) && t.invoiceNumber
        ? (t.paymentStatus === "awaiting_payment"
          ? <Button size="sm" onClick={(e) => { e.stopPropagation(); setPayingCharge(t); }}>Pay {formatCurrency(t.invoiceAmount ?? 0, t.currency)}</Button>
          : <span className="text-caption text-muted">Paid</span>)
        : <span className="text-caption text-muted">—</span>,
    },
  ];

  // Use the shared predicate — a ticket routed to the tenant (F3) has chargeTo but
  // no liability until closure, and must still show as a live charge.
  const openCharges = allTickets.filter((t) => billedToTenant(t) && t.paymentStatus === "awaiting_payment");

  return (
    <div>
      <PageHeader title="Maintenance & Requests" subtitle="Report issues and track them to resolution" />

      {/* Outstanding maintenance charges — surfaced above the fold so a bill is
          never buried inside a ticket row. */}
      {openCharges.length > 0 && (
        <div className="mb-6 space-y-3">
          {openCharges.map((t) => (
            <Card key={t.id} className="flex flex-col items-start justify-between gap-4 border-l-4 border-accent p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-caption font-medium uppercase tracking-wide text-muted">Maintenance charge · {t.invoiceNumber}</p>
                <p className="mt-1 font-heading text-h3 font-semibold text-foreground">{formatCurrency(t.invoiceAmount ?? t.cost ?? 0, t.currency)}</p>
                <p className="mt-0.5 text-caption text-muted">{t.title}{t.invoiceDueDate ? ` · due ${formatDate(t.invoiceDueDate)}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => { const { payload, filename } = maintenanceInvoicePdf(t.id); downloadPdf(payload, filename); }}>
                  <Download size={15} /> Invoice
                </Button>
                <Button onClick={() => setPayingCharge(t)}>Pay charge</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-md border border-border p-0.5">
        {(["maintenance", "complaints"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); reset({ title: "", category: "", priority: "medium", description: "" }); }}
            className={cn("inline-flex items-center gap-1.5 rounded px-4 py-1.5 text-body font-medium capitalize transition-colors", tab === t ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
            {t === "maintenance" ? <AdjustmentsHorizontal size={16} /> : <MessageDots size={16} />}
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Submit form */}
        <Card className="h-fit p-6">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Plus size={20} className="text-primary" /> {isComplaint ? "Raise a complaint" : "New maintenance request"}</h2>
          <p className="mb-4 text-caption text-muted">{data.unit?.label} · {data.property?.name}</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label={isComplaint ? "Subject" : "Issue"} htmlFor="mr-title" error={errors.title?.message}>
              <Input id="mr-title" placeholder={isComplaint ? "e.g. Noise from neighbouring unit" : "e.g. Leaking kitchen tap"} {...register("title")} aria-invalid={!!errors.title} />
            </Field>
            {!isComplaint && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" htmlFor="mr-cat" error={errors.category?.message}>
                  <select id="mr-cat" className={selectClass} {...register("category")} aria-invalid={!!errors.category}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority" htmlFor="mr-pri">
                  <select id="mr-pri" className={selectClass} {...register("priority")}>
                    {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </Field>
              </div>
            )}
            <Field label={isComplaint ? "Details" : "Description"} htmlFor="mr-desc" error={errors.description?.message}>
              <Textarea id="mr-desc" rows={4} placeholder={isComplaint ? "Tell us what happened…" : "Describe the issue and where it is…"} {...register("description")} aria-invalid={!!errors.description} />
            </Field>
            {/* Photo attachment */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-4 text-muted transition-colors hover:border-primary hover:text-primary">
              <ImageIcon size={22} />
              <div><p className="text-body font-medium text-foreground">Attach photos</p><p className="text-caption">Click to browse your device</p></div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const n = e.target.files?.length ?? 0; if (n) toast.success(`${n} photo${n === 1 ? "" : "s"} attached`); e.target.value = ""; }} />
            </label>
            <Button type="submit" className="w-full" loading={isSubmitting}>{isComplaint ? "Submit complaint" : "Submit request"}</Button>
          </form>
        </Card>

        {/* List */}
        <div>
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">{isComplaint ? "Your complaints" : "Your requests"}</h2>
          <DataTable columns={columns} data={rows} getRowId={(t) => t.id} onRowClick={(t) => setDetail(t)}
            emptyTitle={isComplaint ? "No complaints" : "No requests yet"} emptyDescription={isComplaint ? "Raise a complaint and track it here." : "Submit a maintenance request and track it here."} pageSize={8} />
        </div>
      </div>

      <TicketDetailDialog ticket={detail} onOpenChange={(o) => !o && setDetail(null)}
        onPay={(t) => { setDetail(null); setPayingCharge(t); }} />
      <PayChargeDialog ticket={payingCharge} onOpenChange={(o) => !o && setPayingCharge(null)} onDone={reload} />

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>
    </div>
  );
}
