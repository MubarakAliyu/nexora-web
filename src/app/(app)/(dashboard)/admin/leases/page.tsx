"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Clock, PenNib, TrashBin, AdjustmentsHorizontal, FileLines, ArrowRight, Bell } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { LeaseStatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { leaseView, depositSummary } from "@/lib/lease";
import {
  listLeases, createLease, updateLease, renewLease, terminateLease, sendRenewalReminder, deleteLease,
  propertyOptions, propertyName, tenantName, unitLabel, tenantOptions, unitOptions, NOW_ISO,
  type Lease, type Scope, type DepositOutcome,
} from "@/lib/api/admin";
import { CurrencyCode } from "@/components/app/currency-code";

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
            <Field label={<>Rent / mo (<CurrencyCode />)</>} htmlFor="cl-rent" error={errors.rent?.message}>
              <Input id="cl-rent" type="number" {...register("rent", { valueAsNumber: true })} aria-invalid={!!errors.rent} />
            </Field>
            <Field label={<>Deposit (<CurrencyCode />)</>} htmlFor="cl-dep" error={errors.deposit?.message}>
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

const OUTCOMES: { v: DepositOutcome; l: string }[] = [
  { v: "full_refund", l: "Fully Refund" },
  { v: "partial_refund", l: "Partially Refund" },
  { v: "deduct", l: "Deduct for Damages / Rent" },
  { v: "forfeit", l: "Forfeit" },
];

function TerminateDialog({ lease, onOpenChange, onDone }: { lease: Lease | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [reason, setReason] = React.useState("End of term");
  const [exit, setExit] = React.useState("2026-08-31");
  const [outcome, setOutcome] = React.useState<DepositOutcome>("full_refund");
  const [refundAmount, setRefundAmount] = React.useState(0);
  const [depReason, setDepReason] = React.useState("");
  const [owesMore, setOwesMore] = React.useState(false);
  const [additional, setAdditional] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const deposit = lease?.deposit ?? 0;
  const deduction = Math.max(0, deposit - refundAmount);

  React.useEffect(() => {
    if (lease) { setReason("End of term"); setExit("2026-08-31"); setOutcome("full_refund"); setRefundAmount(Math.round(lease.deposit / 2)); setDepReason(""); setOwesMore(false); setAdditional(0); }
  }, [lease]);

  const valid =
    outcome === "full_refund" ? true
    : outcome === "partial_refund" ? refundAmount > 0 && refundAmount < deposit && depReason.trim().length > 0
    : outcome === "deduct" ? depReason.trim().length > 0 && (!owesMore || additional > 0)
    : depReason.trim().length > 0;

  const run = async () => {
    if (!lease || !valid) return;
    setBusy(true);
    try {
      await terminateLease(lease.id, {
        outcome,
        refundAmount: outcome === "partial_refund" ? refundAmount : undefined,
        deductionAmount: outcome === "deduct" ? deposit : outcome === "partial_refund" ? deduction : undefined,
        reason: outcome === "full_refund" ? undefined : depReason,
        additionalOwed: outcome === "deduct" && owesMore ? additional : undefined,
        exitDate: exit,
        terminationReason: reason,
      });
      const label = outcome === "full_refund" ? "fully refunded" : outcome === "partial_refund" ? "partially refunded" : outcome === "deduct" ? "deducted" : "forfeited";
      toast.success("Lease terminated", { description: `${tenantName(lease.tenantId)} — deposit ${label}. Unit released.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t terminate lease"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!lease} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        {lease && (
          <>
            <DialogHeader>
              <DialogTitle>Terminate lease</DialogTitle>
              <DialogDescription>{tenantName(lease.tenantId)} · Unit {unitLabel(lease.unitId)}. The unit will be released to vacant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reason" htmlFor="tm-reason">
                  <select id="tm-reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option>End of term</option><option>Tenant request</option><option>Breach of terms</option><option>Non-payment</option>
                  </select>
                </Field>
                <Field label="Exit date" htmlFor="tm-exit"><Input id="tm-exit" type="date" value={exit} onChange={(e) => setExit(e.target.value)} /></Field>
              </div>

              {/* Deposit outcome */}
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted">Deposit outcome — {formatCurrency(deposit)} held</p>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map((o) => (
                    <label key={o.v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-body transition-colors ${outcome === o.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      <input type="radio" name="tm-outcome" value={o.v} checked={outcome === o.v} onChange={() => setOutcome(o.v)} className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{o.l}</span>
                    </label>
                  ))}
                </div>

                {outcome === "full_refund" && (
                  <p className="mt-3 rounded-lg bg-surface-hover p-3 text-caption text-muted motion-safe:animate-in motion-safe:fade-in">The full deposit of <span className="font-medium text-foreground">{formatCurrency(deposit)}</span> will be returned to {tenantName(lease.tenantId)}.</p>
                )}

                {outcome === "partial_refund" && (
                  <div className="mt-3 space-y-3 motion-safe:animate-in motion-safe:fade-in">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={<>Refund amount (<CurrencyCode />)</>} htmlFor="tm-refund" error={refundAmount <= 0 || refundAmount >= deposit ? "Must be between 0 and the deposit" : undefined}>
                        <Input id="tm-refund" type="number" value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))} />
                      </Field>
                      <Field label="Deduction (auto)" htmlFor="tm-deduct"><Input id="tm-deduct" value={formatCurrency(deduction)} readOnly disabled /></Field>
                    </div>
                    <Field label="Deduction reason" htmlFor="tm-dreason" error={!depReason.trim() ? "Required" : undefined}>
                      <Textarea id="tm-dreason" rows={2} value={depReason} onChange={(e) => setDepReason(e.target.value)} placeholder="e.g. Kitchen cabinet damage repair" />
                    </Field>
                    <p className="rounded-lg bg-surface-hover p-3 text-caption text-muted"><span className="font-medium text-foreground">{formatCurrency(refundAmount)}</span> will be returned. <span className="font-medium text-foreground">{formatCurrency(deduction)}</span> retained{depReason ? ` for: ${depReason}` : ""}.</p>
                  </div>
                )}

                {outcome === "deduct" && (
                  <div className="mt-3 space-y-3 motion-safe:animate-in motion-safe:fade-in">
                    <p className="text-body text-foreground">Deducted: <span className="font-medium">{formatCurrency(deposit)}</span></p>
                    <Field label="Deduction reason" htmlFor="tm-dreason2" error={!depReason.trim() ? "Required" : undefined}>
                      <Textarea id="tm-dreason2" rows={2} value={depReason} onChange={(e) => setDepReason(e.target.value)} placeholder="e.g. 3 months unpaid rent / extensive property damage" />
                    </Field>
                    <label className="flex items-center gap-2 text-body text-foreground">
                      <input type="checkbox" checked={owesMore} onChange={(e) => setOwesMore(e.target.checked)} className="h-4 w-4 rounded text-primary" />
                      Additional amount owed beyond the deposit
                    </label>
                    {owesMore && (
                      <div className="motion-safe:animate-in motion-safe:fade-in">
                        <Field label={<>Additional amount (<CurrencyCode />)</>} htmlFor="tm-add" error={additional <= 0 ? "Enter an amount" : undefined}>
                          <Input id="tm-add" type="number" value={additional} onChange={(e) => setAdditional(Number(e.target.value))} />
                        </Field>
                        {additional > 0 && <p className="mt-1 text-caption text-muted">The tenant owes an additional {formatCurrency(additional)} beyond the security deposit.</p>}
                      </div>
                    )}
                  </div>
                )}

                {outcome === "forfeit" && (
                  <div className="mt-3 space-y-3 motion-safe:animate-in motion-safe:fade-in">
                    <Field label="Forfeiture reason" htmlFor="tm-dreason3" error={!depReason.trim() ? "Required" : undefined}>
                      <Textarea id="tm-dreason3" rows={2} value={depReason} onChange={(e) => setDepReason(e.target.value)} placeholder="e.g. Unauthorized lease termination" />
                    </Field>
                    <p className="rounded-lg bg-surface-hover p-3 text-caption text-muted">The full deposit of <span className="font-medium text-foreground">{formatCurrency(deposit)}</span> will be retained by Nexora.</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={run} loading={busy} disabled={!valid}>Terminate lease</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- page */

export default function LeasesPage() {
  const router = useRouter();
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

  const expiring = (data ?? []).filter((l) => leaseView(l, NOW_ISO).expiringSoon);
  const expiringCount = expiring.length;

  const doRenew = async (lease: Lease) => {
    setBusy(true);
    try { await renewLease(lease.id); toast.success("Lease renewed", { description: `${tenantName(lease.tenantId)} — extended 12 months.` }); reload(); setManage(null); }
    catch { toast.error("Couldn’t renew lease"); }
    finally { setBusy(false); }
  };

  const doRemind = async (lease: Lease) => {
    setBusy(true);
    try { await sendRenewalReminder(lease.id); toast.success("Reminder sent", { description: `${tenantName(lease.tenantId)} was notified about the upcoming expiry.` }); }
    catch { toast.error("Couldn’t send reminder"); }
    finally { setBusy(false); }
  };

  const columns: Column<Lease>[] = [
    { key: "tenant", header: "Tenant", sortable: true, sortValue: (l) => tenantName(l.tenantId), render: (l) => <span className="font-medium text-foreground">{tenantName(l.tenantId)}</span> },
    { key: "property", header: "Property", sortable: true, sortValue: (l) => propertyName(l.propertyId), render: (l) => propertyName(l.propertyId) },
    { key: "unit", header: "Unit", render: (l) => unitLabel(l.unitId) },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (l) => formatCurrency(l.rent) },
    {
      key: "end", header: "Ends", sortable: true,
      render: (l) => {
        const v = leaseView(l, NOW_ISO);
        return (
          <div>
            <span>{formatDate(l.end)}</span>
            {v.expiringSoon && <span className="ml-2 text-caption font-medium text-primary">in {Math.max(0, v.daysToExpiry)}d</span>}
          </div>
        );
      },
    },
    { key: "status", header: "Status", sortable: true, sortValue: (l) => leaseView(l, NOW_ISO).status, render: (l) => <LeaseStatusBadge lease={l} nowIso={NOW_ISO} /> },
    {
      key: "actions", header: "", align: "right",
      render: (l) => (
        <RowActions actions={[
          { label: "Manage", icon: <AdjustmentsHorizontal size={16} />, onClick: () => setManage(l) },
          { label: "Start Move-Out Process", icon: <ArrowRight size={16} />, onClick: () => router.push(`/admin/leases/${l.id}/move-out`) },
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
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton data={rows} filename="leases" columns={[
              { header: "Tenant", accessor: (l) => tenantName(l.tenantId) },
              { header: "Property", accessor: (l) => propertyName(l.propertyId) },
              { header: "Unit", accessor: (l) => unitLabel(l.unitId) },
              { header: "Rent/mo", accessor: (l) => l.rent },
              { header: "Deposit", accessor: (l) => l.deposit },
              { header: "Start", accessor: (l) => l.start.slice(0, 10) },
              { header: "End", accessor: (l) => l.end.slice(0, 10) },
              { header: "Status", accessor: (l) => leaseView(l, NOW_ISO).status },
            ]} />
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Create lease</Button>
          </div>
        } />

      {expiringCount > 0 && (
        <Card className="mb-4 border-l-4 border-primary bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <span className="text-primary"><Clock size={20} /></span>
            <p className="text-body text-foreground"><span className="font-medium">{expiringCount} lease{expiringCount === 1 ? "" : "s"}</span> expiring within 30 days — review for renewal.</p>
          </div>
          <ul className="mt-2 space-y-0.5 pl-8 text-caption text-muted">
            {expiring.slice(0, 4).map((l) => (
              <li key={l.id}>{tenantName(l.tenantId)} — {unitLabel(l.unitId)} — expires in {Math.max(0, leaseView(l, NOW_ISO).daysToExpiry)} days</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenant or unit…" aria-label="Search leases" className="h-10 sm:max-w-xs" />
        <select className={`${selectClass} sm:w-52`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={`${selectClass} sm:w-48`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="renewal_requested">Renewal Requested</option>
          <option value="pending_renewal">Pending Renewal</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(l) => l.id}
        loading={loading} error={error} onRetry={reload} onRowClick={(l) => setManage(l)}
        rowClassName={(l) => leaseView(l, NOW_ISO).expiringSoon ? "border-l-2 border-l-primary bg-primary/[0.03]" : undefined}
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
              {(() => {
                const v = leaseView(manage, NOW_ISO);
                return (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2"><LeaseStatusBadge lease={manage} nowIso={NOW_ISO} /></div>
                      <p className="text-body font-medium text-foreground">
                        {v.expired ? "Expired" : `Expires in ${Math.max(0, v.daysToExpiry)} days`}
                      </p>
                    </div>
                    {v.expiringSoon && (
                      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4 motion-safe:animate-in motion-safe:fade-in">
                        <p className="text-body text-foreground">This lease expires in {Math.max(0, v.daysToExpiry)} days. Consider contacting the tenant about renewal.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => doRenew(manage)} loading={busy}>Initiate Renewal</Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => doRemind(manage)} loading={busy}><Bell size={15} /> Send Reminder</Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-4"><dt className="text-muted">Rent / mo</dt><dd className="font-medium text-foreground">{formatCurrency(manage.rent)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Deposit</dt><dd className="text-right text-foreground">{depositSummary(manage, formatCurrency).label} — {depositSummary(manage, formatCurrency).detail}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Start</dt><dd className="text-foreground">{formatDate(manage.start)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">End</dt><dd className="text-foreground">{formatDate(manage.end)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Frequency</dt><dd className="capitalize text-foreground">{manage.frequency}</dd></div>
              </dl>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="gap-1.5" onClick={() => router.push(`/admin/leases/${manage.id}/move-out`)}><ArrowRight size={16} /> Start Move-Out</Button>
                <Button variant="outline" onClick={() => setTerminating(manage)} disabled={manage.status === "terminated"}>Terminate</Button>
                <Button onClick={() => doRenew(manage)} loading={busy} disabled={manage.status === "terminated"}>Renew 12 months</Button>
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
