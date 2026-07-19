"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Clock, PenNib, TrashBin, AdjustmentsHorizontal, FileLines } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { downloadPdf } from "@/lib/pdf/download";
import { leasePdf } from "@/lib/pdf/builders";
import { formatUGX, formatDate } from "@/lib/format";
import {
  listLeases, createLease, updateLease, renewLease, terminateLease, deleteLease,
  propertyOptions, propertyName, tenantName, unitLabel, tenantOptions, unitOptions,
  type Lease, type Scope,
} from "@/lib/api/admin";

const TERMS = [{ v: "6", l: "6 months" }, { v: "12", l: "12 months" }, { v: "24", l: "24 months" }];
const addMonths = (iso: string, months: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + months); return d.toISOString(); };

/* ---------------------------------------------------------- create / edit */

const formSchema = z.object({
  tenantId: z.string().min(1, "Choose a tenant"),
  unitId: z.string().min(1, "Choose a unit"),
  start: z.string().min(1, "Choose a start date"),
  termMonths: z.string().min(1),
  frequency: z.string().min(1),
  rent: z.number().int().min(50000, "Enter a rent"),
  deposit: z.number().int().min(0, "Enter a deposit"),
  gracePeriod: z.number().int().min(0).max(60),
});
type FormValues = z.infer<typeof formSchema>;

function LeaseFormDialog({ open, onOpenChange, editing, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Lease | null; onDone: () => void;
}) {
  const isEdit = !!editing;
  const tenants = React.useMemo(() => tenantOptions(), []);
  const units = React.useMemo(() => unitOptions({ vacantOnly: !editing }), [editing]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tenantId: "", unitId: "", start: "2026-08-01", termMonths: "12", frequency: "monthly", rent: 2_000_000, deposit: 4_000_000, gracePeriod: 5 },
  });

  React.useEffect(() => {
    if (open) {
      reset(editing
        ? { tenantId: editing.tenantId, unitId: editing.unitId, start: editing.start.slice(0, 10), termMonths: "12", frequency: editing.frequency, rent: editing.rent, deposit: editing.deposit, gracePeriod: editing.gracePeriod ?? 5 }
        : { tenantId: "", unitId: "", start: "2026-08-01", termMonths: "12", frequency: "monthly", rent: 2_000_000, deposit: 4_000_000, gracePeriod: 5 });
    }
  }, [open, editing, reset]);

  const onSubmit = async (v: FormValues) => {
    const startIso = new Date(v.start).toISOString();
    const end = editing ? addMonths(editing.start, Number(v.termMonths)) : addMonths(startIso, Number(v.termMonths));
    try {
      if (isEdit && editing) {
        await updateLease(editing.id, { start: startIso, end, frequency: v.frequency as Lease["frequency"], rent: v.rent, deposit: v.deposit, gracePeriod: v.gracePeriod });
        toast.success("Lease updated", { description: `${tenantName(editing.tenantId)} lease saved.` });
      } else {
        await createLease({ tenantId: v.tenantId, unitId: v.unitId, start: startIso, end, frequency: v.frequency as Lease["frequency"], rent: v.rent, deposit: v.deposit, gracePeriod: v.gracePeriod });
        toast.success("Lease created", { description: `${tenantName(v.tenantId)} · ${unitLabel(v.unitId)}. Unit is now occupied.` });
      }
      onOpenChange(false); onDone();
    } catch { toast.error(isEdit ? "Couldn’t update lease" : "Couldn’t create lease"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lease" : "Create a lease"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the tenancy terms." : "Set up a new tenancy. The chosen unit will be marked occupied."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant" htmlFor="cl-tenant" error={errors.tenantId?.message}>
              <select id="cl-tenant" className={selectClass} disabled={isEdit} {...register("tenantId")} aria-invalid={!!errors.tenantId}>
                <option value="">Select…</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label={isEdit ? "Unit" : "Unit (vacant)"} htmlFor="cl-unit" error={errors.unitId?.message}>
              <select id="cl-unit" className={selectClass} disabled={isEdit} {...register("unitId")} aria-invalid={!!errors.unitId}>
                <option value="">Select…</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </Field>
            <Field label="Start date" htmlFor="cl-start" error={errors.start?.message}>
              <Input id="cl-start" type="date" {...register("start")} aria-invalid={!!errors.start} />
            </Field>
            <Field label="Term" htmlFor="cl-term">
              <select id="cl-term" className={selectClass} {...register("termMonths")}>
                {TERMS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Payment frequency" htmlFor="cl-freq">
              <select id="cl-freq" className={selectClass} {...register("frequency")}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option>
              </select>
            </Field>
            <Field label="Grace period (days)" htmlFor="cl-grace" error={errors.gracePeriod?.message}>
              <Input id="cl-grace" type="number" {...register("gracePeriod", { valueAsNumber: true })} />
            </Field>
            <Field label="Rent / mo (UGX)" htmlFor="cl-rent" error={errors.rent?.message}>
              <Input id="cl-rent" type="number" {...register("rent", { valueAsNumber: true })} aria-invalid={!!errors.rent} />
            </Field>
            <Field label="Deposit (UGX)" htmlFor="cl-dep" error={errors.deposit?.message}>
              <Input id="cl-dep" type="number" {...register("deposit", { valueAsNumber: true })} aria-invalid={!!errors.deposit} />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Create lease"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- terminate */

function TerminateDialog({ lease, onOpenChange, onDone }: { lease: Lease | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [reason, setReason] = React.useState("End of term");
  const [exit, setExit] = React.useState("2026-08-31");
  const [refund, setRefund] = React.useState("full");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (lease) { setReason("End of term"); setExit("2026-08-31"); setRefund("full"); } }, [lease]);

  const run = async () => {
    if (!lease) return;
    setBusy(true);
    try {
      await terminateLease(lease.id);
      toast.success("Lease terminated", { description: `${tenantName(lease.tenantId)} — ${reason}. Deposit: ${refund} refund. Unit released.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t terminate lease"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!lease} onOpenChange={onOpenChange}>
      <DialogContent>
        {lease && (
          <>
            <DialogHeader>
              <DialogTitle>Terminate lease</DialogTitle>
              <DialogDescription>{tenantName(lease.tenantId)} · Unit {unitLabel(lease.unitId)}. The unit will be released to vacant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="Reason" htmlFor="tm-reason">
                <select id="tm-reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option>End of term</option><option>Tenant request</option><option>Breach of terms</option><option>Non-payment</option>
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Exit date" htmlFor="tm-exit"><Input id="tm-exit" type="date" value={exit} onChange={(e) => setExit(e.target.value)} /></Field>
                <Field label="Deposit refund" htmlFor="tm-refund">
                  <select id="tm-refund" className={selectClass} value={refund} onChange={(e) => setRefund(e.target.value)}>
                    <option value="full">Full refund</option><option value="partial">Partial refund</option><option value="none">No refund</option>
                  </select>
                </Field>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={run} loading={busy}>Terminate lease</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- page */

export default function LeasesPage() {
  const [status, setStatus] = React.useState("all");
  const [property, setProperty] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [manage, setManage] = React.useState<Lease | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Lease | null>(null);
  const [terminating, setTerminating] = React.useState<Lease | null>(null);
  const [deleting, setDeleting] = React.useState<Lease | null>(null);
  const [busy, setBusy] = React.useState(false);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const options = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(() => listLeases({ status, propertyId: property }, scope), [status, property, scope]);

  const rows = React.useMemo(() => {
    const all = data ?? [];
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter((l) => tenantName(l.tenantId).toLowerCase().includes(s) || unitLabel(l.unitId).toLowerCase().includes(s));
  }, [data, q]);

  const expiringCount = (data ?? []).filter((l) => l.status === "expiring").length;

  const doRenew = async (lease: Lease) => {
    setBusy(true);
    try { await renewLease(lease.id); toast.success("Lease renewed", { description: `${tenantName(lease.tenantId)} — extended 12 months.` }); reload(); setManage(null); }
    catch { toast.error("Couldn’t renew lease"); }
    finally { setBusy(false); }
  };

  const columns: Column<Lease>[] = [
    { key: "tenant", header: "Tenant", sortable: true, sortValue: (l) => tenantName(l.tenantId), render: (l) => <span className="font-medium text-foreground">{tenantName(l.tenantId)}</span> },
    { key: "property", header: "Property", sortable: true, sortValue: (l) => propertyName(l.propertyId), render: (l) => propertyName(l.propertyId) },
    { key: "unit", header: "Unit", render: (l) => unitLabel(l.unitId) },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (l) => formatUGX(l.rent) },
    { key: "end", header: "Ends", sortable: true, render: (l) => formatDate(l.end) },
    { key: "status", header: "Status", sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (l) => (
        <RowActions actions={[
          { label: "Manage", icon: <AdjustmentsHorizontal size={16} />, onClick: () => setManage(l) },
          { label: "Download agreement", icon: <FileLines size={16} />, onClick: () => { const { payload, filename } = leasePdf(l); downloadPdf(payload, filename); } },
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditing(l); setFormOpen(true); } },
          { label: "Terminate", icon: <Clock size={16} />, onClick: () => setTerminating(l) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(l), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Leases" subtitle="Tenancy agreements across the portfolio"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Create lease</Button>} />

      {expiringCount > 0 && (
        <Card className="mb-4 flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
          <span className="text-primary"><Clock size={20} /></span>
          <p className="text-body text-foreground"><span className="font-medium">{expiringCount} lease{expiringCount === 1 ? "" : "s"}</span> expiring within 60 days — review for renewal.</p>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenant or unit…" aria-label="Search leases" className="h-10 sm:max-w-xs" />
        <select className={`${selectClass} sm:w-52`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={`${selectClass} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option><option value="active">Active</option><option value="expiring">Expiring</option>
          <option value="expired">Expired</option><option value="terminated">Terminated</option><option value="pending">Pending</option>
        </select>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(l) => l.id}
        loading={loading} error={error} onRetry={reload} onRowClick={(l) => setManage(l)}
        emptyTitle="No leases found" emptyDescription="Try adjusting your filters." pageSize={10} />

      {/* Manage dialog */}
      <Dialog open={!!manage} onOpenChange={(o) => !o && setManage(null)}>
        <DialogContent>
          {manage && (
            <>
              <DialogHeader>
                <DialogTitle>Lease — {tenantName(manage.tenantId)}</DialogTitle>
                <DialogDescription>{propertyName(manage.propertyId)} · Unit {unitLabel(manage.unitId)}</DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd><StatusBadge status={manage.status} /></dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Rent / mo</dt><dd className="font-medium text-foreground">{formatUGX(manage.rent)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Deposit</dt><dd className="text-foreground">{formatUGX(manage.deposit)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Start</dt><dd className="text-foreground">{formatDate(manage.start)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">End</dt><dd className="text-foreground">{formatDate(manage.end)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Frequency</dt><dd className="capitalize text-foreground">{manage.frequency}</dd></div>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTerminating(manage)} disabled={manage.status === "terminated"}>Terminate</Button>
                <Button onClick={() => doRenew(manage)} loading={busy}>Renew 12 months</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LeaseFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <TerminateDialog lease={terminating} onOpenChange={(o) => { if (!o) setTerminating(null); }} onDone={() => { reload(); setManage(null); }} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
        entityLabel="lease" entityName={deleting ? `${tenantName(deleting.tenantId)} · ${unitLabel(deleting.unitId)}` : ""}
        onConfirm={async () => {
          if (!deleting) return;
          try { await deleteLease(deleting.id); toast.success("Lease deleted"); reload(); } catch { toast.error("Couldn’t delete lease"); }
        }} />
    </div>
  );
}
