"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Clock } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
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
import { formatUGX, formatDate } from "@/lib/format";
import {
  listLeases, renewLease, terminateLease, propertyOptions, propertyName, tenantName, unitLabel,
  type Lease, type Scope,
} from "@/lib/api/admin";

const createSchema = z.object({
  propertyId: z.string().min(1, "Choose a property"),
  tenant: z.string().min(2, "Enter a tenant name"),
  unit: z.string().min(1, "Enter a unit"),
  rent: z.number().int().min(50000, "Enter a rent"),
  start: z.string().min(1, "Choose a start date"),
  termMonths: z.string().min(1),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateLeaseDialog({ options }: { options: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema), defaultValues: { propertyId: "", termMonths: "12" },
  });
  const onSubmit = async (v: CreateValues) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Lease created", { description: `${v.tenant} · unit ${v.unit}, ${v.termMonths} months.` });
    reset(); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> Create lease</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a lease</DialogTitle>
          <DialogDescription>Set up a new tenancy agreement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Property" htmlFor="cl-prop" error={errors.propertyId?.message}>
            <select id="cl-prop" className={selectClass} {...register("propertyId")} aria-invalid={!!errors.propertyId}>
              <option value="">Select…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant" htmlFor="cl-tenant" error={errors.tenant?.message}>
              <Input id="cl-tenant" {...register("tenant")} aria-invalid={!!errors.tenant} />
            </Field>
            <Field label="Unit" htmlFor="cl-unit" error={errors.unit?.message}>
              <Input id="cl-unit" placeholder="A-402" {...register("unit")} aria-invalid={!!errors.unit} />
            </Field>
            <Field label="Rent / mo (UGX)" htmlFor="cl-rent" error={errors.rent?.message}>
              <Input id="cl-rent" type="number" {...register("rent", { valueAsNumber: true })} aria-invalid={!!errors.rent} />
            </Field>
            <Field label="Start date" htmlFor="cl-start" error={errors.start?.message}>
              <Input id="cl-start" type="date" {...register("start")} aria-invalid={!!errors.start} />
            </Field>
            <Field label="Term" htmlFor="cl-term">
              <select id="cl-term" className={selectClass} {...register("termMonths")}>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </select>
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Create lease</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LeasesPage() {
  const [status, setStatus] = React.useState("all");
  const [property, setProperty] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Lease | null>(null);
  const [busy, setBusy] = React.useState<null | "renew" | "terminate">(null);
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

  const columns: Column<Lease>[] = [
    { key: "tenant", header: "Tenant", sortable: true, sortValue: (l) => tenantName(l.tenantId), render: (l) => <span className="font-medium text-foreground">{tenantName(l.tenantId)}</span> },
    { key: "property", header: "Property", sortable: true, sortValue: (l) => propertyName(l.propertyId), render: (l) => propertyName(l.propertyId) },
    { key: "unit", header: "Unit", render: (l) => unitLabel(l.unitId) },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (l) => formatUGX(l.rent) },
    { key: "end", header: "Ends", sortable: true, render: (l) => formatDate(l.end) },
    { key: "status", header: "Status", sortable: true, render: (l) => <StatusBadge status={l.status} /> },
  ];

  const doRenew = async () => {
    if (!selected) return;
    setBusy("renew");
    try { await renewLease(selected.id); toast.success("Lease renewed", { description: `${tenantName(selected.tenantId)} — extended 12 months.` }); reload(); setSelected(null); }
    catch { toast.error("Couldn’t renew lease"); }
    finally { setBusy(null); }
  };
  const doTerminate = async () => {
    if (!selected) return;
    setBusy("terminate");
    try { await terminateLease(selected.id); toast.success("Lease terminated", { description: `${tenantName(selected.tenantId)} — unit released.` }); reload(); setSelected(null); }
    catch { toast.error("Couldn’t terminate lease"); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <PageHeader title="Leases" subtitle="Tenancy agreements across the portfolio" actions={<CreateLeaseDialog options={options} />} />

      {expiringCount > 0 && (
        <Card className="mb-4 flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
          <span className="text-primary"><Clock size={20} /></span>
          <p className="text-body text-foreground">
            <span className="font-medium">{expiringCount} lease{expiringCount === 1 ? "" : "s"}</span> expiring within 60 days — review for renewal.
          </p>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenant or unit…" aria-label="Search leases" className="h-10 sm:max-w-xs" />
        <select className={`${selectClass} sm:w-52`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={`${selectClass} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <DataTable
        columns={columns} data={rows} getRowId={(l) => l.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(l) => setSelected(l)}
        emptyTitle="No leases found" emptyDescription="Try adjusting your filters." pageSize={10}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Lease — {tenantName(selected.tenantId)}</DialogTitle>
                <DialogDescription>{propertyName(selected.propertyId)} · Unit {unitLabel(selected.unitId)}</DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-body">
                <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Rent / mo</dt><dd className="font-medium text-foreground">{formatUGX(selected.rent)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Deposit</dt><dd className="text-foreground">{formatUGX(selected.deposit)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Start</dt><dd className="text-foreground">{formatDate(selected.start)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">End</dt><dd className="text-foreground">{formatDate(selected.end)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Frequency</dt><dd className="capitalize text-foreground">{selected.frequency}</dd></div>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={doTerminate} loading={busy === "terminate"} disabled={selected.status === "terminated"}>Terminate</Button>
                <Button onClick={doRenew} loading={busy === "renew"}>Renew 12 months</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
