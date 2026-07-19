"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, PenNib, TrashBin } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import { listProperties, createProperty, updateProperty, deleteProperty, type Property, type Scope } from "@/lib/api/admin";
import { categories } from "@/content/portfolio";

const schema = z.object({
  name: z.string().min(2, "Enter a property name"),
  location: z.string().min(2, "Enter a location"),
  category: z.string().min(1, "Choose a category"),
  units: z.number().int("Enter a whole number").min(1, "At least 1 unit"),
  status: z.string().min(1),
  rentalType: z.enum(["short-term", "long-term"]),
  rentalPayment: z.enum(["online", "manual"]),
  bedrooms: z.number().min(0),
  minStay: z.number().min(0),
  maxStay: z.number().min(0),
  amenities: z.string(),
  dailyRate: z.number().min(0),
  weeklyRate: z.number().min(0),
  monthlyRate: z.number().min(0),
  cleaningFee: z.number().min(0),
  annualRent: z.number().min(0),
});
type Values = z.infer<typeof schema>;

const baseDefaults: Values = {
  name: "", location: "", category: "", units: 1, status: "onboarding",
  rentalType: "long-term", rentalPayment: "manual", bedrooms: 0,
  minStay: 6, maxStay: 24, amenities: "",
  dailyRate: 0, weeklyRate: 0, monthlyRate: 0, cleaningFee: 80000, annualRent: 0,
};

function PropertyFormDialog({
  open, onOpenChange, editing, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Property | null;
  onDone: () => void;
}) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: baseDefaults,
  });
  const rentalType = watch("rentalType");

  React.useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              name: editing.name, location: editing.location, category: editing.category,
              units: editing.units, status: editing.status,
              rentalType: editing.rentalType ?? "long-term",
              rentalPayment: editing.rentalPayment ?? (editing.rentalType === "short-term" ? "online" : "manual"),
              bedrooms: editing.bedrooms ?? 0,
              minStay: editing.minStay ?? (editing.rentalType === "short-term" ? 2 : 6),
              maxStay: editing.maxStay ?? (editing.rentalType === "short-term" ? 30 : 24),
              amenities: (editing.amenities ?? []).join(", "),
              dailyRate: editing.shortTerm?.daily ?? 0,
              weeklyRate: editing.shortTerm?.weekly ?? 0,
              monthlyRate: editing.shortTerm?.monthly ?? 0,
              cleaningFee: editing.shortTerm?.cleaningFee ?? 80000,
              annualRent: editing.annualRent ?? 0,
            }
          : baseDefaults,
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (v: Values) => {
    const rental = {
      rentalType: v.rentalType,
      rentalPayment: v.rentalPayment,
      minStay: v.minStay,
      maxStay: v.maxStay,
      bedrooms: v.bedrooms,
      amenities: v.amenities ? v.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [],
      dailyRate: v.dailyRate,
      weeklyRate: v.weeklyRate,
      monthlyRate: v.monthlyRate,
      cleaningFee: v.cleaningFee,
      annualRent: v.annualRent,
    };
    try {
      if (isEdit && editing) {
        await updateProperty(editing.id, { name: v.name, location: v.location, category: v.category as Property["category"], units: v.units, status: v.status as Property["status"], ...rental });
        toast.success("Property updated", { description: `${v.name} was saved.` });
      } else {
        await createProperty({ name: v.name, location: v.location, category: v.category as Property["category"], units: v.units, status: v.status as Property["status"], ...rental });
        toast.success("Property added", { description: `${v.name} is now ${v.status}.` });
      }
      onOpenChange(false);
      onDone();
    } catch {
      toast.error(isEdit ? "Couldn’t update property" : "Couldn’t add property", { description: "Please try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit property" : "Add a property"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this property’s details." : "Register a new property to begin onboarding."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Property name" htmlFor="ap-name" error={errors.name?.message}>
            <Input id="ap-name" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location" htmlFor="ap-loc" error={errors.location?.message}>
              <Input id="ap-loc" {...register("location")} aria-invalid={!!errors.location} />
            </Field>
            <Field label="Units" htmlFor="ap-units" error={errors.units?.message}>
              <Input id="ap-units" type="number" {...register("units", { valueAsNumber: true })} aria-invalid={!!errors.units} />
            </Field>
            <Field label="Category" htmlFor="ap-cat" error={errors.category?.message}>
              <select id="ap-cat" className={selectClass} {...register("category")} aria-invalid={!!errors.category}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status" htmlFor="ap-status">
              <select id="ap-status" className={selectClass} {...register("status")}>
                <option value="onboarding">Onboarding</option>
                <option value="managed">Managed</option>
                <option value="prospect">Prospect</option>
              </select>
            </Field>
          </div>

          {/* Rental configuration */}
          <div className="rounded-lg border border-border bg-surface-hover p-4">
            <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted">Rental configuration</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rental type" htmlFor="ap-rtype">
                <select id="ap-rtype" className={selectClass} {...register("rentalType")}>
                  <option value="long-term">Long-term (inquiry)</option>
                  <option value="short-term">Short-term (instant booking)</option>
                </select>
              </Field>
              <Field label="Payment method" htmlFor="ap-pay">
                <select id="ap-pay" className={selectClass} {...register("rentalPayment")}>
                  <option value="manual">Manual (offline)</option>
                  <option value="online">Online</option>
                </select>
              </Field>
              <Field label="Bedrooms (typical)" htmlFor="ap-beds">
                <Input id="ap-beds" type="number" {...register("bedrooms", { valueAsNumber: true })} />
              </Field>
              <Field label={rentalType === "short-term" ? "Min / max stay (nights)" : "Min / max stay (months)"} htmlFor="ap-minstay">
                <div className="flex gap-2">
                  <Input id="ap-minstay" type="number" aria-label="Minimum stay" {...register("minStay", { valueAsNumber: true })} />
                  <Input aria-label="Maximum stay" type="number" {...register("maxStay", { valueAsNumber: true })} />
                </div>
              </Field>
            </div>

            {rentalType === "short-term" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Daily rate (UGX)" htmlFor="ap-daily">
                  <Input id="ap-daily" type="number" {...register("dailyRate", { valueAsNumber: true })} />
                </Field>
                <Field label="Weekly rate (UGX)" htmlFor="ap-weekly">
                  <Input id="ap-weekly" type="number" {...register("weeklyRate", { valueAsNumber: true })} />
                </Field>
                <Field label="Monthly rate (UGX)" htmlFor="ap-monthly">
                  <Input id="ap-monthly" type="number" {...register("monthlyRate", { valueAsNumber: true })} />
                </Field>
                <Field label="Cleaning fee (UGX)" htmlFor="ap-clean">
                  <Input id="ap-clean" type="number" {...register("cleaningFee", { valueAsNumber: true })} />
                </Field>
              </div>
            ) : (
              <div className="mt-4">
                <Field label="Annual rent (UGX)" htmlFor="ap-annual">
                  <Input id="ap-annual" type="number" {...register("annualRent", { valueAsNumber: true })} />
                </Field>
              </div>
            )}

            <div className="mt-4">
              <Field label="Amenities (comma-separated)" htmlFor="ap-amen">
                <Input id="ap-amen" placeholder="WiFi, Secure Parking, 24/7 Security" {...register("amenities")} />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add property"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertiesPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Property | null>(null);
  const [deleting, setDeleting] = React.useState<Property | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const { data, loading, error, reload } = useAsync(
    () => listProperties({ q, category, status }, scope),
    [q, category, status, scope],
  );

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Property) => { setEditing(p); setFormOpen(true); };

  const columns: Column<Property>[] = [
    {
      key: "name", header: "Property", sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-active">
            <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{p.name}</p>
            <p className="truncate text-caption text-muted">{p.location}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", sortable: true },
    { key: "units", header: "Units", sortable: true, align: "right" },
    {
      key: "occupancy", header: "Occupancy", sortable: true, align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-active">
            <div className="h-full rounded-full bg-primary" style={{ width: `${p.occupancy}%` }} />
          </div>
          <span className="tabular-nums text-foreground">{p.occupancy}%</span>
        </div>
      ),
    },
    { key: "monthlyRevenue", header: "Revenue / mo", sortable: true, align: "right", render: (p) => formatUGX(p.monthlyRevenue) },
    { key: "status", header: "Status", sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (p) => (
        <RowActions actions={[
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => openEdit(p) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(p), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Every property under Nexora management"
        actions={<Button onClick={openCreate} className="gap-2"><Plus size={18} /> Add property</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or location…" aria-label="Search properties" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-48`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={`${selectClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="managed">Managed</option>
          <option value="onboarding">Onboarding</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      <DataTable
        columns={columns} data={data ?? []} getRowId={(p) => p.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(p) => router.push(`/admin/properties/${p.id}`)}
        emptyTitle="No properties found" emptyDescription="Try adjusting your search or filters." pageSize={8}
      />

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <DeleteConfirmation
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        entityLabel="property"
        entityName={deleting?.name ?? ""}
        description="This cannot be undone. Its units and leases will be affected."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteProperty(deleting.id);
            toast.success("Property deleted", { description: `${deleting.name} was removed.` });
            reload();
          } catch {
            toast.error("Couldn’t delete property");
          }
        }}
      />
    </div>
  );
}
