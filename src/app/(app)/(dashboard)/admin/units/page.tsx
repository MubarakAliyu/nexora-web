"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Home, MapPin, UserCircle, PenNib, TrashBin, Cash, FileLines, AdjustmentsHorizontal } from "flowbite-react-icons/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import {
  listUnits, getUnitDetail, createUnit, updateUnit, deleteUnit,
  propertyOptions, propertyName, tenantName,
  type Unit, type UnitType, type UnitStatus, type Scope,
} from "@/lib/api/admin";

const UNIT_TYPES: UnitType[] = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Office", "Retail"];
const AMENITIES = ["Parking", "Balcony", "Furnished", "AC", "Backup power", "Water tank", "Lift", "Security"];

const schema = z.object({
  propertyId: z.string().min(1, "Choose a property"),
  label: z.string().min(1, "Enter a unit label"),
  type: z.string().min(1, "Choose a type"),
  floor: z.number().int().min(0, "Enter a floor"),
  sizeSqm: z.number().int().min(10, "Enter a size"),
  rent: z.number().int().min(50000, "Enter a rent"),
  status: z.string().min(1),
});
type Values = z.infer<typeof schema>;

function UnitFormDialog({
  open, onOpenChange, editing, options, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Unit | null;
  options: { id: string; name: string }[]; onDone: () => void;
}) {
  const isEdit = !!editing;
  const [amenities, setAmenities] = React.useState<string[]>([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { propertyId: "", label: "", type: "", floor: 1, sizeSqm: 50, rent: 1_000_000, status: "vacant" },
  });

  React.useEffect(() => {
    if (open) {
      reset(editing
        ? { propertyId: editing.propertyId, label: editing.label, type: editing.type, floor: editing.floor, sizeSqm: editing.sizeSqm, rent: editing.rent, status: editing.status }
        : { propertyId: "", label: "", type: "", floor: 1, sizeSqm: 50, rent: 1_000_000, status: "vacant" });
      setAmenities(editing?.amenities ?? []);
    }
  }, [open, editing, reset]);

  const toggleAmenity = (a: string) => setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const onSubmit = async (v: Values) => {
    try {
      const payload = { propertyId: v.propertyId, label: v.label, type: v.type as UnitType, floor: v.floor, sizeSqm: v.sizeSqm, rent: v.rent, status: v.status as UnitStatus, amenities };
      if (isEdit && editing) { await updateUnit(editing.id, payload); toast.success("Unit updated", { description: `${v.label} was saved.` }); }
      else { await createUnit(payload); toast.success("Unit added", { description: `${v.label} added to ${propertyName(v.propertyId)}.` }); }
      onOpenChange(false); onDone();
    } catch { toast.error(isEdit ? "Couldn’t update unit" : "Couldn’t add unit"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit unit" : "Add a unit"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this unit’s details." : "Register a new lettable unit."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Property" htmlFor="au-prop" error={errors.propertyId?.message}>
            <select id="au-prop" className={selectClass} {...register("propertyId")} aria-invalid={!!errors.propertyId}>
              <option value="">Select…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit label" htmlFor="au-label" error={errors.label?.message}>
              <Input id="au-label" placeholder="A-402" {...register("label")} aria-invalid={!!errors.label} />
            </Field>
            <Field label="Type" htmlFor="au-type" error={errors.type?.message}>
              <select id="au-type" className={selectClass} {...register("type")} aria-invalid={!!errors.type}>
                <option value="">Select…</option>
                {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Floor" htmlFor="au-floor" error={errors.floor?.message}>
              <Input id="au-floor" type="number" {...register("floor", { valueAsNumber: true })} aria-invalid={!!errors.floor} />
            </Field>
            <Field label="Size (m²)" htmlFor="au-size" error={errors.sizeSqm?.message}>
              <Input id="au-size" type="number" {...register("sizeSqm", { valueAsNumber: true })} aria-invalid={!!errors.sizeSqm} />
            </Field>
            <Field label="Rent / mo (UGX)" htmlFor="au-rent" error={errors.rent?.message}>
              <Input id="au-rent" type="number" {...register("rent", { valueAsNumber: true })} aria-invalid={!!errors.rent} />
            </Field>
            <Field label="Status" htmlFor="au-status">
              <select id="au-status" className={selectClass} {...register("status")}>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="notice">On notice</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-caption font-medium text-foreground">Amenities</span>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1 text-caption font-medium transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"}`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add unit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnitDrawer({ unitId, onClose, onEdit, onDelete, onChanged }: {
  unitId: string; onClose: () => void; onEdit: (u: Unit) => void; onDelete: (u: Unit) => void; onChanged: () => void;
}) {
  const scope: Scope = React.useMemo(() => ({}), []);
  const { data, loading } = useAsync(() => getUnitDetail(unitId, scope), [unitId, scope]);
  const [busy, setBusy] = React.useState(false);

  const changeStatus = async (status: UnitStatus) => {
    if (!data) return;
    setBusy(true);
    try { await updateUnit(data.unit.id, { status }); toast.success("Status updated", { description: `Unit ${data.unit.label} → ${status}.` }); onChanged(); }
    catch { toast.error("Couldn’t update status"); }
    finally { setBusy(false); }
  };

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      {loading || !data ? (
        <div className="space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : (
        <>
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>Unit {data.unit.label}</SheetTitle>
              <StatusBadge status={data.unit.status} />
            </div>
            <SheetDescription>{data.unit.type} · {propertyName(data.unit.propertyId)}</SheetDescription>
          </SheetHeader>

          <dl className="mt-4 space-y-3 text-body">
            <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-2 text-muted"><MapPin size={16} /> Property</dt><dd className="text-right text-foreground">{propertyName(data.unit.propertyId)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Floor</dt><dd className="text-foreground">{data.unit.floor}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Size</dt><dd className="text-foreground">{data.unit.sizeSqm} m²</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-2 text-muted"><Cash size={16} /> Rent / mo</dt><dd className="font-medium text-foreground">{formatUGX(data.unit.rent)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-2 text-muted"><UserCircle size={16} /> Tenant</dt><dd className="text-right text-foreground">{data.tenant ? tenantName(data.tenant.id) : "Vacant"}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-2 text-muted"><FileLines size={16} /> Lease</dt><dd className="text-right">{data.lease ? <StatusBadge status={data.lease.status} /> : <span className="text-muted">None</span>}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Rent status</dt><dd className={data.outstanding > 0 ? "font-medium text-primary" : "text-foreground"}>{data.outstanding > 0 ? `${formatUGX(data.outstanding)} due` : "Up to date"}</dd></div>
            {data.unit.amenities && data.unit.amenities.length > 0 && (
              <div><dt className="mb-1.5 text-muted">Amenities</dt><dd className="flex flex-wrap gap-1.5">{data.unit.amenities.map((a) => <span key={a} className="rounded-full bg-surface-hover px-2 py-0.5 text-caption text-muted">{a}</span>)}</dd></div>
            )}
          </dl>

          <div className="mt-6">
            <h4 className="mb-3 font-heading text-body font-semibold text-foreground">Maintenance history</h4>
            {data.tickets.length > 0 ? (
              <Timeline>
                {data.tickets.slice(0, 5).map((t) => (
                  <TimelineItem key={t.id} title={t.title} time={formatDate(t.createdAt)}>
                    <span className="text-caption text-muted">{t.ref} · </span><PriorityBadge priority={t.priority} className="ml-1 align-middle" />
                  </TimelineItem>
                ))}
              </Timeline>
            ) : (
              <p className="text-body text-muted">No maintenance recorded for this unit.</p>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(data.unit)}><PenNib size={16} /> Edit</Button>
              <Button variant="outline" className="flex-1 gap-2 text-primary" onClick={() => onDelete(data.unit)}><TrashBin size={16} /> Delete</Button>
            </div>
            <Field label="Change status" htmlFor="drw-status">
              <select id="drw-status" className={selectClass} value={data.unit.status} disabled={busy} onChange={(e) => changeStatus(e.target.value as UnitStatus)}>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="notice">On notice</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
            <Button className="w-full gap-2" asChild>
              <Link href="/admin/leases"><AdjustmentsHorizontal size={16} /> Assign tenant</Link>
            </Button>
          </div>
          <button type="button" onClick={onClose} className="sr-only">Close</button>
        </>
      )}
    </SheetContent>
  );
}

export default function UnitsPage() {
  const [q, setQ] = React.useState("");
  const [property, setProperty] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Unit | null>(null);
  const [deleting, setDeleting] = React.useState<Unit | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const options = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(
    () => listUnits({ q, propertyId: property, status, type }, scope),
    [q, property, status, type, scope],
  );

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: Unit) => { setDrawerId(null); setEditing(u); setFormOpen(true); };

  const columns: Column<Unit>[] = [
    {
      key: "label", header: "Unit", sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-active text-muted"><Home size={18} /></span>
          <div><p className="font-medium text-foreground">{u.label}</p><p className="text-caption text-muted">{u.type}</p></div>
        </div>
      ),
    },
    { key: "propertyId", header: "Property", sortable: true, sortValue: (u) => propertyName(u.propertyId), render: (u) => propertyName(u.propertyId) },
    { key: "floor", header: "Floor", sortable: true, align: "right" },
    { key: "sizeSqm", header: "Size", sortable: true, align: "right", render: (u) => `${u.sizeSqm} m²` },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (u) => formatUGX(u.rent) },
    { key: "status", header: "Status", sortable: true, render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (u) => (
        <RowActions actions={[
          { label: "Manage", icon: <AdjustmentsHorizontal size={16} />, onClick: () => setDrawerId(u.id) },
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => openEdit(u) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(u), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Units" subtitle="Every lettable unit across the portfolio" actions={
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton data={data ?? []} filename="units" columns={[
            { header: "Label", accessor: (u) => u.label },
            { header: "Property", accessor: (u) => propertyName(u.propertyId) },
            { header: "Type", accessor: (u) => u.type },
            { header: "Bedrooms", accessor: (u) => u.bedrooms },
            { header: "Size (sqm)", accessor: (u) => u.sizeSqm },
            { header: "Rent", accessor: (u) => u.rent },
            { header: "Status", accessor: (u) => u.status },
          ]} />
          <Button onClick={openCreate} className="gap-2"><Plus size={18} /> Add unit</Button>
        </div>
      } />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search unit…" aria-label="Search units" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} lg:w-52`} value={property} onChange={(e) => setProperty(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={`${selectClass} lg:w-40`} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={`${selectClass} lg:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="notice">On notice</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <DataTable
        columns={columns} data={data ?? []} getRowId={(u) => u.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(u) => setDrawerId(u.id)}
        emptyTitle="No units found" emptyDescription="Try adjusting your search or filters." pageSize={10}
      />

      <Sheet open={!!drawerId} onOpenChange={(o) => !o && setDrawerId(null)}>
        {drawerId && (
          <UnitDrawer unitId={drawerId} onClose={() => setDrawerId(null)} onEdit={openEdit} onDelete={(u) => { setDrawerId(null); setDeleting(u); }} onChanged={reload} />
        )}
      </Sheet>

      <UnitFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} options={options} onDone={reload} />
      <DeleteConfirmation
        open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
        entityLabel="unit" entityName={deleting ? `Unit ${deleting.label}` : ""}
        description="This cannot be undone. Any active lease on this unit will be terminated."
        onConfirm={async () => {
          if (!deleting) return;
          try { await deleteUnit(deleting.id); toast.success("Unit deleted", { description: `Unit ${deleting.label} was removed.` }); reload(); }
          catch { toast.error("Couldn’t delete unit"); }
        }}
      />
    </div>
  );
}
