"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import { listProperties, type Property, type Scope } from "@/lib/api/admin";
import { categories } from "@/content/portfolio";

const schema = z.object({
  name: z.string().min(2, "Enter a property name"),
  location: z.string().min(2, "Enter a location"),
  category: z.string().min(1, "Choose a category"),
  units: z.number().int("Enter a whole number").min(1, "At least 1 unit"),
});
type Values = z.infer<typeof schema>;

function AddPropertyDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { category: "" } });

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Property added", { description: `${v.name} is now onboarding.` });
    reset();
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus size={18} /> Add property
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a property</DialogTitle>
          <DialogDescription>Register a new property to begin onboarding.</DialogDescription>
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
          </div>
          <Field label="Category" htmlFor="ap-cat" error={errors.category?.message}>
            <select id="ap-cat" className={selectClass} {...register("category")} aria-invalid={!!errors.category}>
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>Add property</Button>
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
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const { data, loading, error, reload } = useAsync(
    () => listProperties({ q, category, status }, scope),
    [q, category, status, scope],
  );

  const columns: Column<Property>[] = [
    {
      key: "name",
      header: "Property",
      sortable: true,
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
      key: "occupancy",
      header: "Occupancy",
      sortable: true,
      align: "right",
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
  ];

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Every property under Nexora management"
        actions={<AddPropertyDialog onAdded={reload} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or location…" aria-label="Search properties" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-48`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={`${selectClass} sm:w-40`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="managed">Managed</option>
          <option value="onboarding">Onboarding</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        getRowId={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(p) => router.push(`/admin/properties/${p.id}`)}
        emptyTitle="No properties found"
        emptyDescription="Try adjusting your search or filters."
        pageSize={8}
      />
    </div>
  );
}
