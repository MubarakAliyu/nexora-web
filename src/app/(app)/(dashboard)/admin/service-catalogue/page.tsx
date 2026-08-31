"use client";

import * as React from "react";
import { formatCurrencyFull } from "@/lib/format";
import {
  Plus, PenNib, TrashBin, FileCopy, Download, Upload, ExclamationCircle, CheckCircle, Cash,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { RowActions } from "@/components/app/row-actions";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { ServiceIcon } from "@/components/admin/catalogue/icon-picker";
import { ServiceTypeDialog, CategoryDialog, ItemDialog } from "@/components/admin/catalogue/catalogue-dialogs";
import { BulkPriceDialog } from "@/components/admin/catalogue/bulk-price-dialog";
import { ImportCatalogueDialog } from "@/components/admin/catalogue/import-dialog";
import {
  listServiceTypes, catalogueTree, updateServiceType, deleteServiceType,
  deleteCategory, updateItem, deleteItem, duplicateItem,
  exportCatalogueRows, SELECTION_MODE_LABEL, unconfirmedPricingCount,
} from "@/lib/api/catalogue";
import type { ServiceType, ServiceCategory, CatalogueItem, Currency} from "@/lib/mock/types";

const fmt = (n: number, c: string) => formatCurrencyFull(n, c as Currency);

/* ------------------------------------------------------- inline price cell */

/**
 * Directly editable price. The PM enters a whole price list by hand, so opening a
 * modal per row is not viable — click, type, Enter or blur to save.
 */
function PriceCell({ item, onSaved }: { item: CatalogueItem; onSaved: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(String(item.price));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { setValue(String(item.price)); }, [item.price]);

  const commit = async () => {
    const next = Number(value);
    setEditing(false);
    if (!Number.isFinite(next) || next < 0 || next === item.price) { setValue(String(item.price)); return; }
    // Capture BEFORE the await — the mock store mutates the record in place, so
    // reading item.price afterwards would report the new value as the old one.
    const oldPrice = item.price;
    setBusy(true);
    try {
      await updateItem(item.id, { price: next });
      toast.success("Price updated", {
        description: `${item.name}: ${fmt(oldPrice, item.currency)} → ${fmt(next, item.currency)}`,
      });
      onSaved();
    } catch { toast.error("Couldn’t update the price"); setValue(String(item.price)); }
    finally { setBusy(false); }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit price for ${item.name}`}
        className="w-full rounded px-2 py-1.5 text-right font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {busy ? "Saving…" : fmt(item.price, item.currency)}
      </button>
    );
  }
  return (
    <Input
      autoFocus
      type="number"
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setValue(String(item.price)); setEditing(false); }
      }}
      className="h-9 text-right"
    />
  );
}

/* ---------------------------------------------------------- sort order cell */

function SortCell({ item, onSaved }: { item: CatalogueItem; onSaved: () => void }) {
  const [value, setValue] = React.useState(String(item.sortOrder));
  React.useEffect(() => { setValue(String(item.sortOrder)); }, [item.sortOrder]);
  const commit = async () => {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0 || next === item.sortOrder) { setValue(String(item.sortOrder)); return; }
    try { await updateItem(item.id, { sortOrder: next }); onSaved(); }
    catch { setValue(String(item.sortOrder)); }
  };
  return (
    <Input
      type="number" min={0} value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
      aria-label={`Sort order for ${item.name}`}
      className="h-9 w-16 text-center"
    />
  );
}

/* -------------------------------------------------------------------- page */

export default function ServiceCataloguePage() {
  const role = useSession((s) => s.user?.role);
  const allowed = role === "super_admin" || role === "finance_officer";

  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listServiceTypes(), [scope]);
  const types = React.useMemo(() => data ?? [], [data]);

  const [selectedId, setSelectedId] = React.useState<string>("");
  React.useEffect(() => {
    if (types.length && !types.some((t) => t.id === selectedId)) setSelectedId(types[0].id);
  }, [types, selectedId]);

  // Dialog state
  const [typeDialog, setTypeDialog] = React.useState<{ open: boolean; editing: ServiceType | null }>({ open: false, editing: null });
  const [catDialog, setCatDialog] = React.useState<{ open: boolean; editing: ServiceCategory | null }>({ open: false, editing: null });
  const [itemDialog, setItemDialog] = React.useState<{ open: boolean; categoryId: string; editing: CatalogueItem | null }>({ open: false, categoryId: "", editing: null });
  const [deletingType, setDeletingType] = React.useState<ServiceType | null>(null);
  const [deletingCat, setDeletingCat] = React.useState<ServiceCategory | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<CatalogueItem | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  const tree = React.useMemo(
    () => (selectedId ? catalogueTree(selectedId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, data],
  );
  const selectedType = tree?.serviceType;
  const unconfirmed = React.useMemo(() => unconfirmedPricingCount(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleItem = (id: string) =>
    setSelectedItems((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportCsv = () => {
    const rows = exportCatalogueRows();
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-service-catalogue.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success("Catalogue exported", { description: `${rows.length - 1} items written to CSV.` });
  };

  const confirmPrices = async (t: ServiceType) => {
    try {
      await updateServiceType(t.id, { pricesConfirmed: !t.pricesConfirmed });
      toast.success(t.pricesConfirmed ? "Marked as placeholder pricing" : "Prices marked as confirmed", { description: t.name });
      reload();
    } catch { toast.error("Couldn’t update the service type"); }
  };

  if (!allowed) {
    return (
      <EmptyState
        icon={<Cash size={22} />}
        title="Not available for your role"
        description="The service catalogue is managed by Super Admins and Finance Officers."
      />
    );
  }

  if (loading && !data) {
    return <div><Skeleton className="h-8 w-56" /><Skeleton className="mt-6 h-96 w-full rounded-xl" /></div>;
  }
  if (error) {
    return <EmptyState title="Couldn’t load the catalogue" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />;
  }

  return (
    <div>
      <PageHeader
        title="Service Catalogue"
        subtitle="Service types, categories and prices — the public booking forms build themselves from this"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCsv}><Download size={18} /> Export</Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload size={18} /> Import</Button>
            <Button className="gap-2" onClick={() => setTypeDialog({ open: true, editing: null })}><Plus size={18} /> Add service type</Button>
          </div>
        }
      />

      {unconfirmed > 0 && (
        <Card className="mb-6 flex items-start gap-3 border-l-4 border-accent p-4">
          <ExclamationCircle size={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-body font-medium text-foreground">Placeholder pricing in use</p>
            <p className="mt-0.5 text-caption text-muted">
              {unconfirmed} service type{unconfirmed === 1 ? "" : "s"} still carry placeholder prices. Update the prices
              below and mark the service as confirmed once your final price list is applied.
            </p>
          </div>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Service types */}
        <div className="min-w-0 space-y-2">
          {types.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-body text-muted">No service types yet.</p>
              <Button className="mt-3 gap-2" size="sm" onClick={() => setTypeDialog({ open: true, editing: null })}>
                <Plus size={16} /> Add the first one
              </Button>
            </Card>
          )}
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelectedId(t.id); setSelectedItems([]); }}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedId === t.id ? "border-primary bg-primary/5" : "border-border bg-surface-elevated hover:border-primary/40",
              )}
            >
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md", selectedId === t.id ? "bg-primary/10 text-primary" : "bg-surface-active text-muted")}>
                <ServiceIcon name={t.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium text-foreground">{t.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {!t.active && <Badge className="border-transparent bg-surface-hover text-muted">Inactive</Badge>}
                  {t.pricesConfirmed
                    ? <Badge className="border-transparent bg-primary/10 text-primary">Prices confirmed</Badge>
                    : <Badge className="border-accent/40 bg-surface-active text-foreground">Placeholder</Badge>}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Selected type */}
        {selectedType && tree ? (
          <div className="min-w-0 space-y-5">
            <Card className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h2 className="font-heading text-h3 font-semibold text-foreground">{selectedType.name}</h2>
                  {selectedType.description && <p className="mt-1 text-body text-muted">{selectedType.description}</p>}
                  <p className="mt-1 text-caption text-muted">/{selectedType.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => confirmPrices(selectedType)}>
                    <CheckCircle size={15} /> {selectedType.pricesConfirmed ? "Mark as placeholder" : "Mark prices confirmed"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTypeDialog({ open: true, editing: selectedType })}>
                    <PenNib size={15} /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-primary" onClick={() => setDeletingType(selectedType)}>
                    <TrashBin size={15} /> Delete
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-body font-semibold uppercase tracking-wide text-muted">Categories &amp; items</h3>
              <div className="flex flex-wrap gap-2">
                {selectedItems.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}>
                    <Cash size={15} /> Bulk price ({selectedItems.length})
                  </Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => setCatDialog({ open: true, editing: null })}>
                  <Plus size={15} /> Add category
                </Button>
              </div>
            </div>

            {tree.categories.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-body text-muted">No categories yet — add one to start pricing this service.</p>
              </Card>
            ) : tree.categories.map(({ category, items }) => (
              <Card key={category.id} className="overflow-hidden">
                <div className="flex flex-col justify-between gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-heading text-body font-semibold text-foreground">{category.name}</h4>
                      <Badge className="border-transparent bg-surface-hover text-muted">{SELECTION_MODE_LABEL[category.selectionMode]}</Badge>
                      {category.required && <Badge className="border-primary/30 bg-primary/10 text-primary">Required</Badge>}
                      {!category.active && <Badge className="border-transparent bg-surface-hover text-muted">Inactive</Badge>}
                    </div>
                    {category.description && <p className="mt-1 text-caption text-muted">{category.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setItemDialog({ open: true, categoryId: category.id, editing: null })}>
                      <Plus size={15} /> Item
                    </Button>
                    <RowActions actions={[
                      { label: "Edit category", icon: <PenNib size={16} />, onClick: () => setCatDialog({ open: true, editing: category }) },
                      { label: "Delete category", icon: <TrashBin size={16} />, onClick: () => setDeletingCat(category), danger: true, separatorBefore: true },
                    ]} />
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="p-6 text-center text-body text-muted">No items in this category yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-body">
                      <thead className="bg-surface-hover/60">
                        <tr>
                          <th className="w-10 px-3 py-2" />
                          <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Item</th>
                          <th className="px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-muted">Unit</th>
                          <th className="px-3 py-2 text-right text-caption font-semibold uppercase tracking-wide text-muted">Price</th>
                          <th className="px-3 py-2 text-center text-caption font-semibold uppercase tracking-wide text-muted">Order</th>
                          <th className="px-3 py-2 text-right text-caption font-semibold uppercase tracking-wide text-muted" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className={cn("border-t border-border", !item.active && "opacity-55")}>
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                                aria-label={`Select ${item.name}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-medium text-foreground">{item.name}</span>
                              <span className="mt-0.5 flex flex-wrap gap-1.5">
                                {!item.active && <Badge className="border-transparent bg-surface-hover text-muted">Inactive</Badge>}
                                {item.requiresDescription && <Badge className="border-transparent bg-surface-active text-foreground">Needs description</Badge>}
                                {item.excludeFromTotal && <Badge className="border-accent/40 bg-surface-active text-foreground">Quoted separately</Badge>}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted">{item.unit}</td>
                            <td className="px-3 py-2"><PriceCell item={item} onSaved={reload} /></td>
                            <td className="px-3 py-2 text-center"><SortCell item={item} onSaved={reload} /></td>
                            <td className="px-3 py-2 text-right">
                              <RowActions actions={[
                                { label: "Edit", icon: <PenNib size={16} />, onClick: () => setItemDialog({ open: true, categoryId: category.id, editing: item }) },
                                { label: "Duplicate", icon: <FileCopy size={16} />, onClick: async () => { await duplicateItem(item.id); toast.success("Item duplicated"); reload(); } },
                                { label: item.active ? "Deactivate" : "Activate", onClick: async () => { await updateItem(item.id, { active: !item.active }); toast.success(item.active ? "Item deactivated" : "Item activated", { description: item.name }); reload(); } },
                                { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeletingItem(item), danger: true, separatorBefore: true },
                              ]} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-body text-muted">Select a service type to manage its categories and prices.</p>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <ServiceTypeDialog open={typeDialog.open} editing={typeDialog.editing}
        onOpenChange={(o) => setTypeDialog((s) => ({ ...s, open: o }))} onDone={reload} />
      <CategoryDialog open={catDialog.open} serviceTypeId={selectedId} editing={catDialog.editing}
        onOpenChange={(o) => setCatDialog((s) => ({ ...s, open: o }))} onDone={reload} />
      <ItemDialog open={itemDialog.open} serviceTypeId={selectedId} categoryId={itemDialog.categoryId}
        editing={itemDialog.editing} onOpenChange={(o) => setItemDialog((s) => ({ ...s, open: o }))} onDone={reload} />
      <BulkPriceDialog open={bulkOpen} itemIds={selectedItems}
        onOpenChange={setBulkOpen} onDone={() => { setSelectedItems([]); reload(); }} />
      <ImportCatalogueDialog open={importOpen} onOpenChange={setImportOpen} onDone={reload} />

      <DeleteConfirmation
        open={!!deletingType} onOpenChange={(o) => !o && setDeletingType(null)}
        entityLabel="service type" entityName={deletingType?.name ?? ""}
        description="Its categories and priced items will also be removed. Historical bookings and accepted quotations are unaffected — they keep their own price snapshots."
        onConfirm={async () => {
          if (!deletingType) return;
          try { await deleteServiceType(deletingType.id); toast.success("Service type deleted"); setSelectedId(""); reload(); }
          catch { toast.error("Couldn’t delete the service type"); }
        }}
      />
      <DeleteConfirmation
        open={!!deletingCat} onOpenChange={(o) => !o && setDeletingCat(null)}
        entityLabel="category" entityName={deletingCat?.name ?? ""}
        description="Its priced items will also be removed."
        onConfirm={async () => {
          if (!deletingCat) return;
          try { await deleteCategory(deletingCat.id); toast.success("Category deleted"); reload(); }
          catch { toast.error("Couldn’t delete the category"); }
        }}
      />
      <DeleteConfirmation
        open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)}
        entityLabel="item" entityName={deletingItem?.name ?? ""}
        onConfirm={async () => {
          if (!deletingItem) return;
          try { await deleteItem(deletingItem.id); toast.success("Item deleted"); reload(); }
          catch { toast.error("Couldn’t delete the item"); }
        }}
      />
    </div>
  );
}
