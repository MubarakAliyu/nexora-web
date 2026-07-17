"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Grid, ClipboardList, Search, Plus, PenNib, TrashBin, UserAdd } from "flowbite-react-icons/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { listLeads, createLead, updateLead, convertLead, deleteLead, type Lead, type LeadStatus, type Scope } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const leadSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone"),
  source: z.string().min(2, "Enter a source"),
  service: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
type LeadValues = z.infer<typeof leadSchema>;

function LeadFormDialog({ open, onOpenChange, editing, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Lead | null; onDone: () => void }) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", email: "", phone: "", source: "Referral", service: "Property Management", status: "new", notes: "" },
  });
  React.useEffect(() => {
    if (open) reset(editing
      ? { name: editing.name, email: editing.email, phone: editing.phone, source: editing.source, service: editing.service, status: editing.status, notes: "" }
      : { name: "", email: "", phone: "", source: "Referral", service: "Property Management", status: "new", notes: "" });
  }, [open, editing, reset]);
  const onSubmit = async (v: LeadValues) => {
    try {
      if (isEdit && editing) { await updateLead(editing.id, { status: v.status as LeadStatus }); toast.success("Lead updated", { description: `${editing.name} → ${v.status}.` }); }
      else { await createLead({ name: v.name, email: v.email, phone: v.phone, source: v.source, service: v.service, notes: v.notes }); toast.success("Lead added", { description: v.name }); }
      onOpenChange(false); onDone();
    } catch { toast.error(isEdit ? "Couldn’t update lead" : "Couldn’t add lead"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit lead" : "Add a lead"}</DialogTitle><DialogDescription>{isEdit ? "Update stage and details." : "Capture a new prospect."}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="ld-name" error={errors.name?.message}><Input id="ld-name" disabled={isEdit} {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="ld-email" error={errors.email?.message}><Input id="ld-email" type="email" disabled={isEdit} {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Phone" htmlFor="ld-phone" error={errors.phone?.message}><Input id="ld-phone" disabled={isEdit} {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="Source" htmlFor="ld-source" error={errors.source?.message}><Input id="ld-source" disabled={isEdit} {...register("source")} aria-invalid={!!errors.source} /></Field>
            <Field label="Interested in" htmlFor="ld-service"><Input id="ld-service" disabled={isEdit} {...register("service")} /></Field>
            {isEdit && (
              <Field label="Stage" htmlFor="ld-status">
                <select id="ld-status" className={selectClass} {...register("status")}>
                  <option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option>
                </select>
              </Field>
            )}
          </div>
          {!isEdit && <Field label="Notes (optional)" htmlFor="ld-notes"><Input id="ld-notes" {...register("notes")} /></Field>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add lead"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ lead, onOpenChange, onDone }: { lead: Lead | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [target, setTarget] = React.useState<"owner" | "tenant">("tenant");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (lead) setTarget("tenant"); }, [lead]);
  const run = async () => {
    if (!lead) return;
    setBusy(true);
    try { await convertLead(lead.id, target); toast.success("Lead converted", { description: `${lead.name} is now a ${target}.` }); onOpenChange(false); onDone(); }
    catch { toast.error("Couldn’t convert lead"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent>
        {lead && (
          <>
            <DialogHeader><DialogTitle>Convert {lead.name}</DialogTitle><DialogDescription>Create a new record from this lead’s details and mark it won.</DialogDescription></DialogHeader>
            <Field label="Convert to" htmlFor="cv-target">
              <select id="cv-target" className={selectClass} value={target} onChange={(e) => setTarget(e.target.value as "owner" | "tenant")}>
                <option value="tenant">Tenant</option><option value="owner">Owner</option>
              </select>
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={run} loading={busy}>Convert</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Lead | null>(null);
  const [converting, setConverting] = React.useState<Lead | null>(null);
  const [deleting, setDeleting] = React.useState<Lead | null>(null);
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
    {
      key: "actions", header: "", align: "right",
      render: (l) => (
        <RowActions actions={[
          { label: "View", icon: <Search size={16} />, onClick: () => router.push(`/admin/leads/${l.id}`) },
          { label: "Edit stage", icon: <PenNib size={16} />, onClick: () => { setEditing(l); setFormOpen(true); } },
          { label: "Convert", icon: <UserAdd size={16} />, onClick: () => setConverting(l) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(l), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="CRM / Leads" subtitle="Prospects and enquiries — including live submissions from the marketing site"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Add lead</Button>} />

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

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <ConvertDialog lead={converting} onOpenChange={(o) => { if (!o) setConverting(null); }} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="lead" entityName={deleting?.name ?? ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteLead(deleting.id); toast.success("Lead deleted"); reload(); } catch { toast.error("Couldn’t delete lead"); } }} />
    </div>
  );
}
