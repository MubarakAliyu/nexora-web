/**
 * Service catalogue API (F1).
 *
 * The whole point of this module: NOTHING about the catalogue lives in code.
 * Service types, categories, item names, units and prices are all admin-managed
 * rows. The public booking forms read whatever is here and render themselves, so
 * when the stakeholder's price list finally arrives the PM types it into the admin
 * UI and the forms update — no developer, no deploy.
 *
 * Every mutation flows through `recordMutation` (store + toast + notification +
 * audit). Price changes deliberately record the OLD and NEW value in the audit
 * summary: repricing is a financial control, not a cosmetic edit.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import type {
  ServiceType, ServiceCategory, CatalogueItem, SelectionMode,
  CatalogueCurrency, Quotation, QuotationLine,
} from "@/lib/mock/types";

const mDelay = (ms = 320) => new Promise((r) => setTimeout(r, ms));
const now = () => db.NOW_ISO;
const money = (n: number, c: CatalogueCurrency = "UGX") =>
  `${c} ${Math.round(n).toLocaleString("en-UG")}`;

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const SELECTION_MODE_LABEL: Record<SelectionMode, string> = {
  quantity: "Quantity",
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
};

/** Plain-English helper shown under each option in the category form. */
export const SELECTION_MODE_HELP: Record<SelectionMode, string> = {
  quantity: "Customer chooses how many of each item",
  single_choice: "Customer picks exactly one option",
  multi_choice: "Customer can tick several options",
};

/** Suggestion chips for the free-text unit field. Not a whitelist — just hints. */
export const UNIT_SUGGESTIONS = ["per room", "per item", "per kg", "per service", "per vehicle"];

/* ------------------------------------------------------------------ reads */

export interface CatalogueTree {
  serviceType: ServiceType;
  categories: { category: ServiceCategory; items: CatalogueItem[] }[];
}

const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export async function listServiceTypes(opts?: { activeOnly?: boolean }): Promise<ServiceType[]> {
  await mDelay();
  return db.serviceTypes
    .filter((t) => (opts?.activeOnly ? t.active : true))
    .slice()
    .sort(bySort);
}

/** Synchronous read for render paths that already hold the live revision. */
export function serviceTypesSync(activeOnly = false): ServiceType[] {
  return db.serviceTypes.filter((t) => (activeOnly ? t.active : true)).slice().sort(bySort);
}

export function categoriesFor(serviceTypeId: string, activeOnly = false): ServiceCategory[] {
  return db.serviceCategories
    .filter((c) => c.serviceTypeId === serviceTypeId && (activeOnly ? c.active : true))
    .slice()
    .sort(bySort);
}

export function itemsFor(categoryId: string, activeOnly = false): CatalogueItem[] {
  return db.catalogueItems
    .filter((i) => i.categoryId === categoryId && (activeOnly ? i.active : true))
    .slice()
    .sort(bySort);
}

/**
 * The whole configured tree for one service type. `activeOnly` is what the public
 * booking form uses, so anything the admin deactivates simply stops appearing.
 */
export function catalogueTree(serviceTypeId: string, activeOnly = false): CatalogueTree | null {
  const serviceType = db.serviceTypes.find((t) => t.id === serviceTypeId);
  if (!serviceType) return null;
  return {
    serviceType,
    categories: categoriesFor(serviceTypeId, activeOnly).map((category) => ({
      category,
      items: itemsFor(category.id, activeOnly),
    })),
  };
}

export function serviceTypeBySlug(slug: string): ServiceType | undefined {
  return db.serviceTypes.find((t) => t.slug === slug);
}

/** True when a service type has at least one active item the customer could pick. */
export function hasBookableItems(serviceTypeId: string): boolean {
  const tree = catalogueTree(serviceTypeId, true);
  return !!tree && tree.categories.some((c) => c.items.length > 0);
}

/** Any service type still on placeholder pricing — drives the admin banner. */
export function unconfirmedPricingCount(): number {
  return db.serviceTypes.filter((t) => !t.pricesConfirmed).length;
}

/* ------------------------------------------------------- service type CRUD */

export interface ServiceTypeInput {
  name: string;
  description?: string | null;
  icon: string;
  active: boolean;
  sortOrder: number;
  bookingRoute?: string | null;
}

export async function createServiceType(input: ServiceTypeInput): Promise<ServiceType> {
  await mDelay();
  const st: ServiceType = {
    id: `svt_${Date.now()}`,
    name: input.name.trim(),
    slug: slugify(input.name),
    description: input.description?.trim() || null,
    icon: input.icon,
    bookingRoute: input.bookingRoute ?? null,
    active: input.active,
    sortOrder: input.sortOrder,
    pricesConfirmed: false,
    createdAt: now(),
    updatedAt: now(),
  };
  db.serviceTypes.push(st);
  recordMutation({
    entityType: "service_type", entityId: st.id, entityName: st.name, action: "created",
    summary: `Created service type "${st.name}"`,
    after: { name: st.name, slug: st.slug, active: st.active },
    notify: { type: "system", title: "Service type created", body: `"${st.name}" was added to the service catalogue.` },
  });
  return st;
}

export async function updateServiceType(id: string, patch: Partial<ServiceTypeInput> & { pricesConfirmed?: boolean }): Promise<ServiceType> {
  await mDelay();
  const st = db.serviceTypes.find((t) => t.id === id);
  if (!st) throw new Error("Service type not found");
  const before = { name: st.name, active: st.active, pricesConfirmed: st.pricesConfirmed };
  if (patch.name !== undefined) { st.name = patch.name.trim(); st.slug = slugify(patch.name); }
  if (patch.description !== undefined) st.description = patch.description?.trim() || null;
  if (patch.icon !== undefined) st.icon = patch.icon;
  if (patch.active !== undefined) st.active = patch.active;
  if (patch.sortOrder !== undefined) st.sortOrder = patch.sortOrder;
  if (patch.bookingRoute !== undefined) st.bookingRoute = patch.bookingRoute;
  if (patch.pricesConfirmed !== undefined) st.pricesConfirmed = patch.pricesConfirmed;
  st.updatedAt = now();

  const confirmedChanged = patch.pricesConfirmed !== undefined && patch.pricesConfirmed !== before.pricesConfirmed;
  recordMutation({
    entityType: "service_type", entityId: id, entityName: st.name, action: "updated",
    summary: confirmedChanged
      ? `${st.name} pricing marked as ${st.pricesConfirmed ? "confirmed" : "placeholder"}`
      : `Updated service type "${st.name}"`,
    before, after: { name: st.name, active: st.active, pricesConfirmed: st.pricesConfirmed },
    notify: { type: "system", title: "Service catalogue updated", body: `"${st.name}" was updated.` },
  });
  return st;
}

/** Removes the service type and everything under it. Historical bookings and
 *  accepted quotations are untouched — they carry their own snapshots. */
export async function deleteServiceType(id: string): Promise<{ ok: true }> {
  await mDelay();
  const st = db.serviceTypes.find((t) => t.id === id);
  if (!st) throw new Error("Service type not found");
  const cats = db.serviceCategories.filter((c) => c.serviceTypeId === id).length;
  const items = db.catalogueItems.filter((i) => i.serviceTypeId === id).length;

  for (let i = db.catalogueItems.length - 1; i >= 0; i--) if (db.catalogueItems[i].serviceTypeId === id) db.catalogueItems.splice(i, 1);
  for (let i = db.serviceCategories.length - 1; i >= 0; i--) if (db.serviceCategories[i].serviceTypeId === id) db.serviceCategories.splice(i, 1);
  const idx = db.serviceTypes.findIndex((t) => t.id === id);
  if (idx >= 0) db.serviceTypes.splice(idx, 1);

  recordMutation({
    entityType: "service_type", entityId: id, entityName: st.name, action: "deleted",
    summary: `Deleted service type "${st.name}" (${cats} categories, ${items} items). Historical bookings unaffected.`,
    before: { name: st.name },
    notify: { type: "system", title: "Service type removed", body: `"${st.name}" was removed from the catalogue.` },
  });
  return { ok: true };
}

/* ----------------------------------------------------------- category CRUD */

export interface ServiceCategoryInput {
  serviceTypeId: string;
  name: string;
  description?: string | null;
  selectionMode: SelectionMode;
  required: boolean;
  active: boolean;
  sortOrder: number;
}

export async function createCategory(input: ServiceCategoryInput): Promise<ServiceCategory> {
  await mDelay();
  const sc: ServiceCategory = {
    id: `svc_${Date.now()}`,
    serviceTypeId: input.serviceTypeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    selectionMode: input.selectionMode,
    required: input.required,
    active: input.active,
    sortOrder: input.sortOrder,
  };
  db.serviceCategories.push(sc);
  const stName = db.serviceTypes.find((t) => t.id === sc.serviceTypeId)?.name ?? "service";
  recordMutation({
    entityType: "service_category", entityId: sc.id, entityName: sc.name, action: "created",
    summary: `Added category "${sc.name}" to ${stName} (${SELECTION_MODE_LABEL[sc.selectionMode]})`,
    after: { name: sc.name, selectionMode: sc.selectionMode, required: sc.required },
    notify: { type: "system", title: "Category added", body: `"${sc.name}" was added to ${stName}.` },
  });
  return sc;
}

export async function updateCategory(id: string, patch: Partial<Omit<ServiceCategoryInput, "serviceTypeId">>): Promise<ServiceCategory> {
  await mDelay();
  const sc = db.serviceCategories.find((c) => c.id === id);
  if (!sc) throw new Error("Category not found");
  const before = { name: sc.name, selectionMode: sc.selectionMode, required: sc.required, active: sc.active };
  if (patch.name !== undefined) sc.name = patch.name.trim();
  if (patch.description !== undefined) sc.description = patch.description?.trim() || null;
  if (patch.selectionMode !== undefined) sc.selectionMode = patch.selectionMode;
  if (patch.required !== undefined) sc.required = patch.required;
  if (patch.active !== undefined) sc.active = patch.active;
  if (patch.sortOrder !== undefined) sc.sortOrder = patch.sortOrder;
  recordMutation({
    entityType: "service_category", entityId: id, entityName: sc.name, action: "updated",
    summary: `Updated category "${sc.name}"`,
    before, after: { name: sc.name, selectionMode: sc.selectionMode, required: sc.required, active: sc.active },
    notify: false,
  });
  return sc;
}

export async function deleteCategory(id: string): Promise<{ ok: true }> {
  await mDelay();
  const sc = db.serviceCategories.find((c) => c.id === id);
  if (!sc) throw new Error("Category not found");
  const items = db.catalogueItems.filter((i) => i.categoryId === id).length;
  for (let i = db.catalogueItems.length - 1; i >= 0; i--) if (db.catalogueItems[i].categoryId === id) db.catalogueItems.splice(i, 1);
  const idx = db.serviceCategories.findIndex((c) => c.id === id);
  if (idx >= 0) db.serviceCategories.splice(idx, 1);
  recordMutation({
    entityType: "service_category", entityId: id, entityName: sc.name, action: "deleted",
    summary: `Deleted category "${sc.name}" and its ${items} item${items === 1 ? "" : "s"}`,
    before: { name: sc.name },
    notify: false,
  });
  return { ok: true };
}

/* --------------------------------------------------------------- item CRUD */

export interface CatalogueItemInput {
  serviceTypeId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  unit: string;
  price: number;
  currency: CatalogueCurrency;
  minQuantity: number | null;
  maxQuantity: number | null;
  requiresDescription: boolean;
  excludeFromTotal: boolean;
  active: boolean;
  sortOrder: number;
}

export async function createItem(input: CatalogueItemInput): Promise<CatalogueItem> {
  await mDelay();
  const item: CatalogueItem = {
    id: `cit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    unit: input.unit.trim(),
    createdAt: now(),
    updatedAt: now(),
  };
  db.catalogueItems.push(item);
  recordMutation({
    entityType: "catalogue_item", entityId: item.id, entityName: item.name, action: "created",
    summary: `Added "${item.name}" at ${money(item.price, item.currency)} ${item.unit}`,
    after: { name: item.name, price: item.price, unit: item.unit },
    notify: { type: "system", title: "Catalogue item added", body: `"${item.name}" — ${money(item.price, item.currency)} ${item.unit}` },
  });
  return item;
}

export async function updateItem(id: string, patch: Partial<CatalogueItemInput>): Promise<CatalogueItem> {
  await mDelay();
  const item = db.catalogueItems.find((i) => i.id === id);
  if (!item) throw new Error("Item not found");
  const before = { name: item.name, price: item.price, unit: item.unit, active: item.active };
  const priceChanged = patch.price !== undefined && patch.price !== item.price;
  const oldPrice = item.price;

  if (patch.name !== undefined) item.name = patch.name.trim();
  if (patch.description !== undefined) item.description = patch.description?.trim() || null;
  if (patch.unit !== undefined) item.unit = patch.unit.trim();
  if (patch.price !== undefined) item.price = patch.price;
  if (patch.currency !== undefined) item.currency = patch.currency;
  if (patch.minQuantity !== undefined) item.minQuantity = patch.minQuantity;
  if (patch.maxQuantity !== undefined) item.maxQuantity = patch.maxQuantity;
  if (patch.requiresDescription !== undefined) item.requiresDescription = patch.requiresDescription;
  if (patch.excludeFromTotal !== undefined) item.excludeFromTotal = patch.excludeFromTotal;
  if (patch.active !== undefined) item.active = patch.active;
  if (patch.sortOrder !== undefined) item.sortOrder = patch.sortOrder;
  if (patch.categoryId !== undefined) item.categoryId = patch.categoryId;
  item.updatedAt = now();

  recordMutation({
    entityType: "catalogue_item", entityId: id, entityName: item.name, action: "updated",
    // Repricing is a financial control — the audit trail states both values.
    summary: priceChanged
      ? `${item.name} price changed from ${money(oldPrice, item.currency)} to ${money(item.price, item.currency)}`
      : `Updated catalogue item "${item.name}"`,
    before, after: { name: item.name, price: item.price, unit: item.unit, active: item.active },
    notify: priceChanged
      ? { type: "system", title: "Price updated", body: `${item.name}: ${money(oldPrice, item.currency)} → ${money(item.price, item.currency)}` }
      : false,
  });
  return item;
}

export async function deleteItem(id: string): Promise<{ ok: true }> {
  await mDelay();
  const item = db.catalogueItems.find((i) => i.id === id);
  if (!item) throw new Error("Item not found");
  const idx = db.catalogueItems.findIndex((i) => i.id === id);
  db.catalogueItems.splice(idx, 1);
  recordMutation({
    entityType: "catalogue_item", entityId: id, entityName: item.name, action: "deleted",
    summary: `Deleted catalogue item "${item.name}"`,
    before: { name: item.name, price: item.price },
    notify: false,
  });
  return { ok: true };
}

/** Copy an item within its category — for entering many similar priced rows fast. */
export async function duplicateItem(id: string): Promise<CatalogueItem> {
  await mDelay(200);
  const src = db.catalogueItems.find((i) => i.id === id);
  if (!src) throw new Error("Item not found");
  const copy: CatalogueItem = {
    ...src,
    id: `cit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `${src.name} (copy)`,
    sortOrder: src.sortOrder + 1,
    createdAt: now(),
    updatedAt: now(),
  };
  db.catalogueItems.push(copy);
  recordMutation({
    entityType: "catalogue_item", entityId: copy.id, entityName: copy.name, action: "created",
    summary: `Duplicated "${src.name}" → "${copy.name}"`,
    after: { name: copy.name, price: copy.price },
    notify: false,
  });
  return copy;
}

/* -------------------------------------------------------- bulk price update */

export type BulkMode = "percent" | "flat";

export interface BulkPriceChange {
  itemId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  currency: CatalogueCurrency;
}

/** Compute what a bulk change WOULD do. Pure — drives the confirmation preview. */
export function previewBulkPrice(itemIds: string[], mode: BulkMode, value: number): BulkPriceChange[] {
  return itemIds
    .map((id) => db.catalogueItems.find((i) => i.id === id))
    .filter((i): i is CatalogueItem => !!i)
    .map((i) => ({
      itemId: i.id,
      name: i.name,
      oldPrice: i.price,
      newPrice: mode === "percent" ? Math.max(0, Math.round(i.price * (1 + value / 100))) : Math.max(0, Math.round(value)),
      currency: i.currency,
    }));
}

export async function applyBulkPrice(changes: BulkPriceChange[]): Promise<number> {
  await mDelay(500);
  let applied = 0;
  for (const c of changes) {
    const item = db.catalogueItems.find((i) => i.id === c.itemId);
    if (!item || item.price === c.newPrice) continue;
    item.price = c.newPrice;
    item.updatedAt = now();
    applied++;
  }
  recordMutation({
    entityType: "catalogue_item", entityId: "bulk", entityName: `${applied} items`, action: "updated",
    summary: `Bulk price update applied to ${applied} item${applied === 1 ? "" : "s"}: ${changes
      .slice(0, 6)
      .map((c) => `${c.name} ${money(c.oldPrice, c.currency)} → ${money(c.newPrice, c.currency)}`)
      .join("; ")}${changes.length > 6 ? `; +${changes.length - 6} more` : ""}`,
    after: { count: applied },
    notify: { type: "system", title: "Prices updated", body: `Bulk price update applied to ${applied} catalogue item${applied === 1 ? "" : "s"}.` },
  });
  return applied;
}

/* ------------------------------------------------------------- CSV in / out */

export interface CatalogueCsvRow {
  serviceType: string;
  category: string;
  item: string;
  unit: string;
  price: string;
  currency: string;
  active: string;
}

export const CSV_HEADERS = ["Service Type", "Category", "Item", "Unit", "Price", "Currency", "Active"];

export function exportCatalogueRows(): string[][] {
  const rows: string[][] = [CSV_HEADERS];
  serviceTypesSync()
    .forEach((st) =>
      categoriesFor(st.id).forEach((c) =>
        itemsFor(c.id).forEach((i) =>
          rows.push([st.name, c.name, i.name, i.unit, String(i.price), i.currency, i.active ? "yes" : "no"]),
        ),
      ),
    );
  return rows;
}

export type ImportChangeKind = "added" | "updated" | "unchanged" | "error";

export interface ImportPreviewRow {
  line: number;
  kind: ImportChangeKind;
  serviceType: string;
  category: string;
  item: string;
  unit: string;
  price: number;
  currency: CatalogueCurrency;
  active: boolean;
  oldPrice?: number;
  message?: string;
}

/**
 * Parse an uploaded catalogue CSV into a preview. Nothing is written here — the
 * admin sees exactly what would change and confirms before anything is applied.
 * Unknown service types/categories and malformed prices are flagged by line number.
 */
export function previewImport(csv: string): ImportPreviewRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const out: ImportPreviewRow[] = [];
  const start = /service\s*type/i.test(lines[0]) ? 1 : 0;

  for (let n = start; n < lines.length; n++) {
    const cells = splitCsvLine(lines[n]);
    const line = n + 1;
    const [stName = "", catName = "", itemName = "", unit = "", priceRaw = "", currRaw = "UGX", activeRaw = "yes"] = cells;

    const base = {
      line, serviceType: stName, category: catName, item: itemName, unit,
      price: 0, currency: "UGX" as CatalogueCurrency, active: true,
    };

    if (!stName || !catName || !itemName) {
      out.push({ ...base, kind: "error", message: "Missing service type, category or item name" });
      continue;
    }
    const st = db.serviceTypes.find((t) => t.name.toLowerCase() === stName.trim().toLowerCase());
    if (!st) {
      out.push({ ...base, kind: "error", message: `Unknown service type "${stName}"` });
      continue;
    }
    const cat = db.serviceCategories.find(
      (c) => c.serviceTypeId === st.id && c.name.toLowerCase() === catName.trim().toLowerCase(),
    );
    if (!cat) {
      out.push({ ...base, kind: "error", message: `Unknown category "${catName}" in ${st.name}` });
      continue;
    }
    const price = Number(String(priceRaw).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(price) || price < 0) {
      out.push({ ...base, kind: "error", message: `Invalid price "${priceRaw}"` });
      continue;
    }
    const currency: CatalogueCurrency = String(currRaw).trim().toUpperCase() === "USD" ? "USD" : "UGX";
    const active = !/^(no|false|0|inactive)$/i.test(String(activeRaw).trim());

    const existing = db.catalogueItems.find(
      (i) => i.categoryId === cat.id && i.name.toLowerCase() === itemName.trim().toLowerCase(),
    );
    if (!existing) {
      out.push({ ...base, kind: "added", price, currency, active, unit: unit || "per item" });
    } else if (existing.price !== price || existing.unit !== unit || existing.active !== active || existing.currency !== currency) {
      out.push({ ...base, kind: "updated", price, currency, active, unit, oldPrice: existing.price });
    } else {
      out.push({ ...base, kind: "unchanged", price, currency, active, unit });
    }
  }
  return out;
}

/** Minimal CSV line splitter that honours double-quoted cells. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim()); cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export async function applyImport(rows: ImportPreviewRow[]): Promise<{ added: number; updated: number }> {
  await mDelay(600);
  let added = 0, updated = 0;
  for (const r of rows) {
    if (r.kind !== "added" && r.kind !== "updated") continue;
    const st = db.serviceTypes.find((t) => t.name.toLowerCase() === r.serviceType.trim().toLowerCase());
    if (!st) continue;
    const cat = db.serviceCategories.find(
      (c) => c.serviceTypeId === st.id && c.name.toLowerCase() === r.category.trim().toLowerCase(),
    );
    if (!cat) continue;
    const existing = db.catalogueItems.find(
      (i) => i.categoryId === cat.id && i.name.toLowerCase() === r.item.trim().toLowerCase(),
    );
    if (existing) {
      existing.price = r.price;
      existing.unit = r.unit || existing.unit;
      existing.currency = r.currency;
      existing.active = r.active;
      existing.updatedAt = now();
      updated++;
    } else {
      const maxSort = Math.max(0, ...db.catalogueItems.filter((i) => i.categoryId === cat.id).map((i) => i.sortOrder));
      db.catalogueItems.push({
        id: `cit_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        serviceTypeId: st.id,
        categoryId: cat.id,
        name: r.item.trim(),
        description: null,
        unit: r.unit || "per item",
        price: r.price,
        currency: r.currency,
        minQuantity: 0,
        maxQuantity: 20,
        requiresDescription: false,
        excludeFromTotal: false,
        active: r.active,
        sortOrder: maxSort + 1,
        createdAt: now(),
        updatedAt: now(),
      });
      added++;
    }
  }
  recordMutation({
    entityType: "catalogue_item", entityId: "import", entityName: "Catalogue import", action: "updated",
    summary: `Catalogue import applied — ${added} item${added === 1 ? "" : "s"} added, ${updated} updated`,
    after: { added, updated },
    notify: { type: "system", title: "Catalogue imported", body: `${added} added, ${updated} updated.` },
  });
  return { added, updated };
}

/* ------------------------------------------------------------- quotations */

export interface QuotationSelectionLine {
  itemId: string;
  quantity: number;
  description?: string;
}

/**
 * Build (but do not persist) a quotation from a live selection. Prices are read
 * from the catalogue HERE and then frozen by `acceptQuotation`.
 */
export function buildQuotation(serviceTypeId: string, selections: QuotationSelectionLine[]) {
  const st = db.serviceTypes.find((t) => t.id === serviceTypeId);
  const lines: QuotationLine[] = [];
  for (const sel of selections) {
    const item = db.catalogueItems.find((i) => i.id === sel.itemId);
    if (!item || sel.quantity <= 0) continue;
    const lineTotal = item.excludeFromTotal ? 0 : item.price * sel.quantity;
    lines.push({
      itemId: item.id,
      categoryId: item.categoryId,
      name: item.name,
      unit: item.unit,
      quantity: sel.quantity,
      unitPriceAtBooking: item.price,
      lineTotal,
      description: sel.description,
      excludedFromTotal: item.excludeFromTotal,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const currency = (db.catalogueItems.find((i) => i.serviceTypeId === serviceTypeId)?.currency ?? "UGX") as CatalogueCurrency;
  return {
    serviceTypeId,
    serviceTypeName: st?.name ?? "Service",
    lines,
    subtotal,
    total: subtotal,
    currency,
  };
}

export async function acceptQuotation(
  bookingId: string,
  serviceTypeId: string,
  selections: QuotationSelectionLine[],
): Promise<Quotation> {
  await mDelay(450);
  const built = buildQuotation(serviceTypeId, selections);

  // Any earlier quote for this booking is superseded, never mutated — going back
  // and changing the scope must not rewrite what was previously agreed.
  db.quotations.filter((q) => q.bookingId === bookingId && q.status === "accepted").forEach((q) => { q.status = "superseded"; });

  const quote: Quotation = {
    id: `qot_${Date.now()}`,
    bookingId,
    serviceTypeId,
    serviceTypeName: built.serviceTypeName,
    lines: built.lines,
    subtotal: built.subtotal,
    total: built.total,
    currency: built.currency,
    acceptedAt: now(),
    status: "accepted",
  };
  db.quotations.unshift(quote);

  const sb = db.serviceBookings.find((b) => b.id === bookingId);
  if (sb) {
    sb.status = "quote_accepted";
    sb.quotationId = quote.id;
    sb.quoteTotal = quote.total;
    sb.amount = quote.total;
    sb.assessedAmount = quote.total;
  }

  recordMutation({
    entityType: "service-booking", entityId: bookingId, entityName: sb?.reference ?? bookingId, action: "updated",
    summary: `Quotation accepted — ${built.serviceTypeName}, ${money(quote.total, quote.currency)} across ${quote.lines.length} item${quote.lines.length === 1 ? "" : "s"}`,
    after: { quotationId: quote.id, total: quote.total, currency: quote.currency },
    notify: {
      type: "system",
      title: "Quotation accepted",
      body: `Quotation accepted — ${built.serviceTypeName} for ${sb?.name ?? "customer"}, ${money(quote.total, quote.currency)}`,
    },
  });
  return quote;
}

export function quotationForBooking(bookingId: string): Quotation | undefined {
  return db.quotations.find((q) => q.bookingId === bookingId && q.status === "accepted");
}
