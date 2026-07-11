"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Home, MapPin, UserCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import { listUnits, propertyOptions, propertyName, tenantName, type Unit, type Scope } from "@/lib/api/admin";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse", "Office", "Retail"] as const;

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

function AddUnitDialog({ onAdded, options }: { onAdded: () => void; options: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { propertyId: "", type: "", status: "vacant" },
  });
  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Unit added", { description: `${v.label} added to ${propertyName(v.propertyId)}.` });
    reset();
    setOpen(false);
    onAdded();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> Add unit</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a unit</DialogTitle>
          <DialogDescription>Register a new lettable unit.</DialogDescription>
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
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Add unit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UnitsPage() {
  const [q, setQ] = React.useState("");
  const [property, setProperty] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [selected, setSelected] = React.useState<Unit | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const options = React.useMemo(() => propertyOptions(), []);

  const { data, loading, error, reload } = useAsync(
    () => listUnits({ q, propertyId: property, status, type }, scope),
    [q, property, status, type, scope],
  );

  const columns: Column<Unit>[] = [
    {
      key: "label", header: "Unit", sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-active text-muted"><Home size={18} /></span>
          <div>
            <p className="font-medium text-foreground">{u.label}</p>
            <p className="text-caption text-muted">{u.type}</p>
          </div>
        </div>
      ),
    },
    { key: "propertyId", header: "Property", sortable: true, sortValue: (u) => propertyName(u.propertyId), render: (u) => propertyName(u.propertyId) },
    { key: "floor", header: "Floor", sortable: true, align: "right" },
    { key: "sizeSqm", header: "Size", sortable: true, align: "right", render: (u) => `${u.sizeSqm} m²` },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (u) => formatUGX(u.rent) },
    { key: "status", header: "Status", sortable: true, render: (u) => <StatusBadge status={u.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Units" subtitle="Every lettable unit across the portfolio" actions={<AddUnitDialog onAdded={reload} options={options} />} />

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
        onRowClick={(u) => setSelected(u)}
        emptyTitle="No units found" emptyDescription="Try adjusting your search or filters." pageSize={10}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Unit {selected.label}</SheetTitle>
                <SheetDescription>{selected.type}</SheetDescription>
              </SheetHeader>
              <div className="mt-2"><StatusBadge status={selected.status} /></div>
              <dl className="mt-4 space-y-3 text-body">
                <div className="flex items-center justify-between gap-4">
                  <dt className="inline-flex items-center gap-2 text-muted"><MapPin size={16} /> Property</dt>
                  <dd className="text-right text-foreground">{propertyName(selected.propertyId)}</dd>
                </div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Floor</dt><dd className="text-foreground">{selected.floor}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Size</dt><dd className="text-foreground">{selected.sizeSqm} m²</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Bedrooms</dt><dd className="text-foreground">{selected.bedrooms || "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Rent / mo</dt><dd className="font-medium text-foreground">{formatUGX(selected.rent)}</dd></div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="inline-flex items-center gap-2 text-muted"><UserCircle size={16} /> Tenant</dt>
                  <dd className="text-right text-foreground">{selected.tenantId ? tenantName(selected.tenantId) : "Vacant"}</dd>
                </div>
              </dl>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => toast.info("Edit unit", { description: "Editing is mocked in this build." })}>Edit</Button>
                <Button className="flex-1" onClick={() => toast.info("Assign tenant", { description: "Leasing flow is mocked in this build." })}>Assign</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
