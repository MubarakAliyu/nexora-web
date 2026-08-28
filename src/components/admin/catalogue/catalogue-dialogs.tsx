"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { IconPicker } from "./icon-picker";
import {
  createServiceType, updateServiceType, createCategory, updateCategory,
  createItem, updateItem, SELECTION_MODE_HELP, UNIT_SUGGESTIONS,
} from "@/lib/api/catalogue";
import type {
  ServiceType, ServiceCategory, CatalogueItem, SelectionMode, CatalogueCurrency,
} from "@/lib/mock/types";

/* ------------------------------------------------------------ service type */

const typeSchema = z.object({
  name: z.string().min(2, "Enter a service name"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0),
});
type TypeValues = z.infer<typeof typeSchema>;

export function ServiceTypeDialog({ open, editing, onOpenChange, onDone }: {
  open: boolean;
  editing: ServiceType | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [icon, setIcon] = React.useState("Tag");
  const [active, setActive] = React.useState(true);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TypeValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: { name: "", description: "", sortOrder: 1 },
  });

  React.useEffect(() => {
    if (!open) return;
    setIcon(editing?.icon ?? "Tag");
    setActive(editing?.active ?? true);
    reset({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      sortOrder: editing?.sortOrder ?? 1,
    });
  }, [open, editing, reset]);

  const submit = async (v: TypeValues) => {
    try {
      if (editing) {
        await updateServiceType(editing.id, { ...v, icon, active });
        toast.success("Service type updated", { description: v.name });
      } else {
        await createServiceType({ ...v, icon, active });
        toast.success("Service type created", { description: `${v.name} — add categories and priced items next.` });
      }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t save the service type"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit service type" : "Add service type"}</DialogTitle>
          <DialogDescription>A top-level bookable service. Categories and priced items live inside it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <Field label="Name" htmlFor="st-name" error={errors.name?.message}>
            <Input id="st-name" placeholder="e.g. Garden Maintenance" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Description" htmlFor="st-desc">
            <Textarea id="st-desc" rows={2} placeholder="Shown to customers on the booking form" {...register("description")} />
          </Field>
          <Field label="Icon" htmlFor="st-icon">
            <IconPicker value={icon} onChange={setIcon} />
          </Field>
          <Field label="Sort order" htmlFor="st-sort" error={errors.sortOrder?.message}>
            <Input id="st-sort" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
          </Field>
          <div className="flex items-center gap-2.5">
            <Checkbox id="st-active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
            <Label htmlFor="st-active" className="font-normal text-foreground">Active — customers can book this service</Label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{editing ? "Save changes" : "Create service type"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- category */

const MODES: SelectionMode[] = ["quantity", "single_choice", "multi_choice"];

const catSchema = z.object({
  name: z.string().min(2, "Enter a category name"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0),
});
type CatValues = z.infer<typeof catSchema>;

export function CategoryDialog({ open, serviceTypeId, editing, onOpenChange, onDone }: {
  open: boolean;
  serviceTypeId: string;
  editing: ServiceCategory | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [mode, setMode] = React.useState<SelectionMode>("quantity");
  const [required, setRequired] = React.useState(false);
  const [active, setActive] = React.useState(true);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CatValues>({
    resolver: zodResolver(catSchema),
    defaultValues: { name: "", description: "", sortOrder: 1 },
  });

  React.useEffect(() => {
    if (!open) return;
    setMode(editing?.selectionMode ?? "quantity");
    setRequired(editing?.required ?? false);
    setActive(editing?.active ?? true);
    reset({ name: editing?.name ?? "", description: editing?.description ?? "", sortOrder: editing?.sortOrder ?? 1 });
  }, [open, editing, reset]);

  const submit = async (v: CatValues) => {
    try {
      if (editing) {
        await updateCategory(editing.id, { ...v, selectionMode: mode, required, active });
        toast.success("Category updated", { description: v.name });
      } else {
        await createCategory({ ...v, serviceTypeId, selectionMode: mode, required, active });
        toast.success("Category added", { description: v.name });
      }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t save the category"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>How the customer chooses determines what the booking form renders.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <Field label="Name" htmlFor="sc-name" error={errors.name?.message}>
            <Input id="sc-name" placeholder="e.g. Rooms, Add-ons, Wash Type" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Description" htmlFor="sc-desc">
            <Textarea id="sc-desc" rows={2} {...register("description")} />
          </Field>

          <div>
            <p className="mb-2 text-body font-medium text-foreground">How does the customer choose?</p>
            <div className="space-y-2">
              {MODES.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                    mode === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <input type="radio" name="selectionMode" value={m} checked={mode === m}
                    onChange={() => setMode(m)} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-body font-medium capitalize text-foreground">{m.replace(/_/g, " ")}</span>
                    <span className="mt-0.5 block text-caption text-muted">{SELECTION_MODE_HELP[m]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Sort order" htmlFor="sc-sort" error={errors.sortOrder?.message}>
            <Input id="sc-sort" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
          </Field>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Checkbox id="sc-req" checked={required} onCheckedChange={(v) => setRequired(v === true)} />
              <Label htmlFor="sc-req" className="font-normal text-foreground">Required — the customer must choose from this category</Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox id="sc-active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
              <Label htmlFor="sc-active" className="font-normal text-foreground">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{editing ? "Save changes" : "Add category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------- item */

const itemSchema = z.object({
  name: z.string().min(1, "Enter an item name"),
  description: z.string().optional(),
  unit: z.string().min(1, "Enter a unit label"),
  price: z.number().min(0, "Price cannot be negative"),
  minQuantity: z.number().int().min(0),
  maxQuantity: z.number().int().min(1),
  sortOrder: z.number().int().min(0),
});
type ItemValues = z.infer<typeof itemSchema>;

export function ItemDialog({ open, serviceTypeId, categoryId, editing, onOpenChange, onDone }: {
  open: boolean;
  serviceTypeId: string;
  categoryId: string;
  editing: CatalogueItem | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [currency, setCurrency] = React.useState<CatalogueCurrency>("UGX");
  const [requiresDescription, setRequiresDescription] = React.useState(false);
  const [excludeFromTotal, setExcludeFromTotal] = React.useState(false);
  const [active, setActive] = React.useState(true);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", description: "", unit: "per item", price: 0, minQuantity: 0, maxQuantity: 20, sortOrder: 1 },
  });

  React.useEffect(() => {
    if (!open) return;
    setCurrency(editing?.currency ?? "UGX");
    setRequiresDescription(editing?.requiresDescription ?? false);
    setExcludeFromTotal(editing?.excludeFromTotal ?? false);
    setActive(editing?.active ?? true);
    reset({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      unit: editing?.unit ?? "per item",
      price: editing?.price ?? 0,
      minQuantity: editing?.minQuantity ?? 0,
      maxQuantity: editing?.maxQuantity ?? 20,
      sortOrder: editing?.sortOrder ?? 1,
    });
  }, [open, editing, reset]);

  const submit = async (v: ItemValues) => {
    try {
      const payload = {
        ...v,
        serviceTypeId, categoryId, currency,
        requiresDescription, excludeFromTotal, active,
        minQuantity: v.minQuantity, maxQuantity: v.maxQuantity,
      };
      if (editing) {
        await updateItem(editing.id, payload);
        toast.success("Item updated", { description: v.name });
      } else {
        await createItem(payload);
        toast.success("Item added", { description: `${v.name} — ${currency} ${v.price.toLocaleString()} ${v.unit}` });
      }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t save the item"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>The priced thing a customer selects.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <Field label="Name" htmlFor="ci-name" error={errors.name?.message}>
            <Input id="ci-name" placeholder="e.g. Bedroom, Shirt, Full Wash" {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Description" htmlFor="ci-desc">
            <Textarea id="ci-desc" rows={2} {...register("description")} />
          </Field>

          <Field label="Unit label" htmlFor="ci-unit" error={errors.unit?.message}>
            <Input id="ci-unit" placeholder="per room" {...register("unit")} aria-invalid={!!errors.unit} />
            {/* Free text — the chips are suggestions, not a whitelist. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {UNIT_SUGGESTIONS.map((u) => (
                <button key={u} type="button" onClick={() => setValue("unit", u, { shouldValidate: true })}
                  className="rounded-full border border-border px-2.5 py-1 text-caption text-muted transition-colors hover:border-primary hover:text-primary">
                  {u}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price" htmlFor="ci-price" error={errors.price?.message}>
              <Input id="ci-price" type="number" min={0} step={100} {...register("price", { valueAsNumber: true })} aria-invalid={!!errors.price} />
            </Field>
            <Field label="Currency" htmlFor="ci-cur">
              <select id="ci-cur" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value as CatalogueCurrency)}>
                <option value="UGX">UGX</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Min quantity" htmlFor="ci-min" error={errors.minQuantity?.message}>
              <Input id="ci-min" type="number" min={0} {...register("minQuantity", { valueAsNumber: true })} />
            </Field>
            <Field label="Max quantity" htmlFor="ci-max" error={errors.maxQuantity?.message}>
              <Input id="ci-max" type="number" min={1} {...register("maxQuantity", { valueAsNumber: true })} />
            </Field>
            <Field label="Sort order" htmlFor="ci-sort" error={errors.sortOrder?.message}>
              <Input id="ci-sort" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
            </Field>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border p-3">
            <div className="flex items-start gap-2.5">
              <Checkbox id="ci-reqdesc" checked={requiresDescription} onCheckedChange={(v) => setRequiresDescription(v === true)} className="mt-0.5" />
              <Label htmlFor="ci-reqdesc" className="font-normal text-foreground">
                Requires a description
                <span className="mt-0.5 block text-caption text-muted">Customer must describe what they need — used for “Other” items.</span>
              </Label>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox id="ci-excl" checked={excludeFromTotal} onCheckedChange={(v) => setExcludeFromTotal(v === true)} className="mt-0.5" />
              <Label htmlFor="ci-excl" className="font-normal text-foreground">
                Exclude from total
                <span className="mt-0.5 block text-caption text-muted">Shown to the customer but quoted separately after review.</span>
              </Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox id="ci-active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
              <Label htmlFor="ci-active" className="font-normal text-foreground">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{editing ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
