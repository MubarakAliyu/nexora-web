/**
 * Typed async accessors over the mock DB. Every call simulates network latency
 * so components render real loading states, and accepts an optional `forceError`
 * so error states are demonstrable (pages pass it from `?debug=error`).
 *
 * Identity scoping: pass `{ ownerId }` or `{ tenantId }` to filter to a single
 * user's data — this is what the Owner (Batch 10) and Tenant (Batch 11) portals
 * use to show only their records.
 */

import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import type {
  Activity,
  Announcement,
  AudienceKind,
  BroadcastChannel,
  CommLog,
  Expense,
  ExpenseCategory,
  Invoice,
  Lead,
  LeadActivity,
  Lease,
  MaintenanceTicket,
  Owner,
  Payment,
  Property,
  RentalType,
  RentalPaymentMode,
  Staff,
  Tenant,
  TicketStatus,
  Unit,
  UnitStatus,
  UnitType,
} from "@/lib/mock/types";

export type { Activity, Announcement, AudienceKind, BroadcastChannel, CommLog, Expense, ExpenseCategory, Invoice, Lead, LeadActivity, Lease, MaintenanceTicket, Owner, Payment, Property, Staff, Tenant, Unit };
export type { Building, LeaseStatus, InvoiceStatus, TicketStatus, TicketPriority, UnitStatus, UnitType, PropertyStatus, TicketCategory, PaymentMethod, LeadStatus } from "@/lib/mock/types";
export type { RoleDef, PermissionSet, WalletTx, BankAccount, TxType, TxStatus } from "@/lib/mock/types";
export type { RentalType, RentalPaymentMode, RentalListing, ShortTermPricing } from "@/lib/mock/types";
export type { Booking, BookingStatus, ServiceBooking, ServiceBookingStatus, ServiceBookingKind } from "@/lib/mock/types";
export const PERMISSION_MODULES = db.PERMISSION_MODULES;

const BEDROOMS_BY_TYPE: Record<UnitType, number> = {
  Studio: 0, "1 Bedroom": 1, "2 Bedroom": 2, "3 Bedroom": 3, Penthouse: 4, Office: 0, Retail: 0,
};
const mDelay = () => new Promise((r) => setTimeout(r, 450));

export const NOW_ISO = db.NOW_ISO;

export interface Scope {
  ownerId?: string;
  tenantId?: string;
  forceError?: boolean;
}

class NotFoundError extends Error {}
export { NotFoundError };

function respond<T>(data: T, opts?: { error?: boolean; ms?: number }): Promise<T> {
  const ms = opts?.ms ?? 350 + Math.floor(Math.random() * 450);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (opts?.error) reject(new Error("Failed to load data. Please try again."));
      else resolve(data);
    }, ms);
  });
}

/** Property ids visible to a scope (owner → only theirs; else all). */
function scopedPropertyIds(scope?: Scope): Set<string> | null {
  if (scope?.ownerId) {
    const o = db.owners.find((x) => x.id === scope.ownerId);
    return new Set(o?.propertyIds ?? []);
  }
  if (scope?.tenantId) {
    const t = db.tenants.find((x) => x.id === scope.tenantId);
    return new Set(t ? [t.propertyId] : []);
  }
  return null;
}

/* ------------------------------------------------------------ dashboard */

export interface DashboardStats {
  properties: number;
  units: number;
  occupancy: number;
  monthlyRevenue: number;
  outstanding: number;
  openTickets: number;
}

export async function getDashboardStats(scope?: Scope): Promise<DashboardStats> {
  const ids = scopedPropertyIds(scope);
  const props = ids ? db.properties.filter((p) => ids.has(p.id)) : db.properties;
  const propIds = new Set(props.map((p) => p.id));
  const totalUnits = props.reduce((s, p) => s + p.units, 0);
  const occ = props.length
    ? Math.round(props.reduce((s, p) => s + p.occupancy, 0) / props.length)
    : 0;
  const monthlyRevenue = props.reduce((s, p) => s + p.monthlyRevenue, 0);
  const outstanding = db.invoices
    .filter((i) => propIds.has(i.propertyId) && (i.status === "overdue" || i.status === "pending" || i.status === "partial"))
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  const openTickets = db.tickets.filter(
    (t) => propIds.has(t.propertyId) && t.status !== "completed" && t.status !== "closed",
  ).length;
  return respond({ properties: props.length, units: totalUnits, occupancy: occ, monthlyRevenue, outstanding, openTickets }, { error: scope?.forceError });
}

export async function getActivity(scope?: Scope): Promise<Activity[]> {
  return respond(db.activities.slice(0, 10), { error: scope?.forceError });
}

export interface Alert {
  id: string;
  kind: "lease" | "invoice" | "ticket";
  severity: "warning" | "danger" | "info";
  text: string;
  href: string;
}

export async function getAlerts(scope?: Scope): Promise<Alert[]> {
  const ids = scopedPropertyIds(scope);
  const inScope = (pid: string) => !ids || ids.has(pid);
  const alerts: Alert[] = [];
  for (const l of db.leases.filter((x) => x.status === "expiring" && inScope(x.propertyId)).slice(0, 4)) {
    const t = db.tenants.find((x) => x.id === l.tenantId);
    alerts.push({ id: `al_${l.id}`, kind: "lease", severity: "warning", text: `Lease expiring soon — ${t?.name ?? "tenant"}`, href: "/admin/leases" });
  }
  for (const i of db.invoices.filter((x) => x.status === "overdue" && inScope(x.propertyId)).slice(0, 4)) {
    const t = db.tenants.find((x) => x.id === i.tenantId);
    alerts.push({ id: `al_${i.id}`, kind: "invoice", severity: "danger", text: `Overdue invoice ${i.number} — ${t?.name ?? "tenant"}`, href: "/admin/finance" });
  }
  for (const tk of db.tickets.filter((x) => x.priority === "urgent" && x.status !== "closed" && x.status !== "completed" && inScope(x.propertyId)).slice(0, 3)) {
    alerts.push({ id: `al_${tk.id}`, kind: "ticket", severity: "danger", text: `Urgent ticket — ${tk.title}`, href: "/admin/maintenance" });
  }
  return respond(alerts, { error: scope?.forceError });
}

export interface Series {
  label: string;
  value: number;
}

export async function getOccupancySeries(scope?: Scope): Promise<Series[]> {
  const ids = scopedPropertyIds(scope);
  const props = ids ? db.properties.filter((p) => ids.has(p.id)) : db.properties;
  const base = props.length ? props.reduce((s, p) => s + p.occupancy, 0) / props.length : 0;
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  return respond(
    months.map((m, i) => ({ label: m, value: Math.round(Math.max(60, Math.min(99, base - 8 + i * 1.6)) ) })),
    { error: scope?.forceError },
  );
}

export async function getRevenueSeries(scope?: Scope): Promise<Series[]> {
  const ids = scopedPropertyIds(scope);
  const props = ids ? db.properties.filter((p) => ids.has(p.id)) : db.properties;
  const base = props.reduce((s, p) => s + p.monthlyRevenue, 0);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  return respond(
    months.map((m, i) => ({ label: m, value: Math.round((base * (0.82 + i * 0.036)) / 1_000_000) })),
    { error: scope?.forceError },
  );
}

/* ------------------------------------------------------------ properties */

export interface PropertyFilter {
  q?: string;
  category?: string;
  status?: string;
}

export async function listProperties(filter?: PropertyFilter, scope?: Scope): Promise<Property[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.properties.filter((p) => ids.has(p.id)) : [...db.properties];
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
  }
  if (filter?.category && filter.category !== "all") rows = rows.filter((p) => p.category === filter.category);
  if (filter?.status && filter.status !== "all") rows = rows.filter((p) => p.status === filter.status);
  return respond(rows, { error: scope?.forceError });
}

export async function getProperty(id: string, scope?: Scope): Promise<Property> {
  const p = db.properties.find((x) => x.id === id);
  if (!p) throw new NotFoundError(id);
  return respond(p, { error: scope?.forceError });
}

export async function getPropertyUnits(id: string, scope?: Scope): Promise<Unit[]> {
  return respond(db.units.filter((u) => u.propertyId === id), { error: scope?.forceError });
}

export async function getPropertyTenants(id: string, scope?: Scope): Promise<Tenant[]> {
  return respond(db.tenants.filter((t) => t.propertyId === id), { error: scope?.forceError });
}

/* ----------------------------------------------------- property mutations */

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = base || `property`;
  let n = 2;
  while (db.properties.some((p) => p.id === id)) id = `${base}-${n++}`;
  return id;
}

export interface PropertyInput {
  name: string;
  location: string;
  category: Property["category"];
  units: number;
  ownerId?: string;
  status?: Property["status"];
  image?: string;
  /* rental listing config */
  rentalType?: RentalType;
  rentalPayment?: RentalPaymentMode;
  minStay?: number;
  maxStay?: number;
  bedrooms?: number;
  amenities?: string[];
  /* short-term pricing */
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  cleaningFee?: number;
  /* long-term pricing */
  annualRent?: number;
}

/** Build the rental-config slice of a Property from a PropertyInput. */
function rentalConfigFrom(input: Partial<PropertyInput>): Partial<Property> {
  const out: Partial<Property> = {};
  if (input.rentalType) out.rentalType = input.rentalType;
  if (input.rentalPayment) out.rentalPayment = input.rentalPayment;
  if (input.minStay != null) out.minStay = input.minStay;
  if (input.maxStay != null) out.maxStay = input.maxStay;
  if (input.bedrooms != null) out.bedrooms = input.bedrooms;
  if (input.amenities) out.amenities = input.amenities;
  if (input.rentalType === "short-term") {
    out.shortTerm = {
      daily: input.dailyRate ?? 0,
      weekly: input.weeklyRate ?? (input.dailyRate ?? 0) * 6,
      monthly: input.monthlyRate ?? (input.dailyRate ?? 0) * 24,
      cleaningFee: input.cleaningFee ?? 0,
    };
    out.annualRent = undefined;
  } else if (input.rentalType === "long-term") {
    out.annualRent = input.annualRent ?? 0;
    out.shortTerm = undefined;
  }
  return out;
}

export async function createProperty(input: PropertyInput): Promise<Property> {
  await new Promise((r) => setTimeout(r, 500));
  const id = slugify(input.name);
  const property: Property = {
    id,
    name: input.name,
    location: input.location,
    category: input.category,
    image: input.image ?? "/images/properties/apartment-facade.jpg",
    ownerId: input.ownerId ?? db.owners[0]?.id ?? "own_salim",
    status: input.status ?? "onboarding",
    units: input.units,
    occupancy: 0,
    monthlyRevenue: 0,
    buildings: [{ id: `bld_${id}_1`, name: "Main Block", floors: Math.max(1, Math.ceil(input.units / 4)), units: input.units }],
    since: db.NOW_ISO,
    rentalType: input.rentalType ?? "long-term",
    rentalPayment: input.rentalPayment ?? (input.rentalType === "short-term" ? "online" : "manual"),
    amenities: input.amenities ?? [],
    bedrooms: input.bedrooms ?? 0,
    availableUnits: input.units,
    ...rentalConfigFrom(input),
  };
  db.properties.unshift(property);
  const owner = db.owners.find((o) => o.id === property.ownerId);
  if (owner) owner.propertyIds.push(id);
  recordMutation({
    entityType: "property",
    entityId: id,
    entityName: property.name,
    action: "created",
    summary: `Added property "${property.name}" (${input.units} units) in ${property.location}`,
    after: { name: property.name, units: property.units, status: property.status },
    notify: { type: "system", title: "Property added", body: `${property.name} was added to the portfolio.` },
  });
  return property;
}

export async function updateProperty(id: string, patch: Partial<PropertyInput>): Promise<Property> {
  await new Promise((r) => setTimeout(r, 500));
  const property = db.properties.find((p) => p.id === id);
  if (!property) throw new NotFoundError(id);
  const before = { name: property.name, location: property.location, status: property.status, units: property.units };
  Object.assign(property, {
    name: patch.name ?? property.name,
    location: patch.location ?? property.location,
    category: patch.category ?? property.category,
    units: patch.units ?? property.units,
    status: patch.status ?? property.status,
    ...rentalConfigFrom(patch),
  });
  recordMutation({
    entityType: "property",
    entityId: id,
    entityName: property.name,
    action: "updated",
    summary: `Updated property "${property.name}"`,
    before,
    after: { name: property.name, location: property.location, status: property.status, units: property.units },
    notify: { type: "system", title: "Property updated", body: `${property.name} details were updated.` },
  });
  return property;
}

export async function deleteProperty(id: string): Promise<{ ok: true }> {
  await new Promise((r) => setTimeout(r, 500));
  const idx = db.properties.findIndex((p) => p.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.properties.splice(idx, 1);
  // Cascade: remove this property's units and terminate its leases.
  for (let i = db.units.length - 1; i >= 0; i--) if (db.units[i].propertyId === id) db.units.splice(i, 1);
  db.leases.forEach((l) => { if (l.propertyId === id) l.status = "terminated"; });
  const owner = db.owners.find((o) => o.propertyIds.includes(id));
  if (owner) owner.propertyIds = owner.propertyIds.filter((p) => p !== id);
  recordMutation({
    entityType: "property",
    entityId: id,
    entityName: removed.name,
    action: "deleted",
    summary: `Deleted property "${removed.name}" and its units`,
    before: { name: removed.name, units: removed.units },
    notify: { type: "system", title: "Property deleted", body: `${removed.name} was removed from the portfolio.` },
  });
  return { ok: true };
}

/* ============================================================ unit mutations */

export interface UnitInput {
  propertyId: string;
  label: string;
  type: UnitType;
  floor: number;
  sizeSqm: number;
  rent: number;
  status: UnitStatus;
  amenities?: string[];
}

export async function createUnit(input: UnitInput): Promise<Unit> {
  await mDelay();
  const property = db.properties.find((p) => p.id === input.propertyId);
  const unit: Unit = {
    id: `unit_${input.propertyId}_${Date.now()}`,
    label: input.label,
    propertyId: input.propertyId,
    buildingId: property?.buildings[0]?.id ?? `bld_${input.propertyId}_1`,
    floor: input.floor,
    type: input.type,
    bedrooms: BEDROOMS_BY_TYPE[input.type],
    sizeSqm: input.sizeSqm,
    rent: input.rent,
    status: input.status,
    amenities: input.amenities,
  };
  db.units.unshift(unit);
  if (property) property.units += 1;
  recordMutation({
    entityType: "unit", entityId: unit.id, entityName: unit.label, action: "created",
    summary: `Added unit ${unit.label} to ${propertyName(unit.propertyId)}`,
    after: { label: unit.label, type: unit.type, rent: unit.rent, status: unit.status },
    notify: { type: "system", title: "Unit added", body: `Unit ${unit.label} was added to ${propertyName(unit.propertyId)}.` },
  });
  return unit;
}

export async function updateUnit(id: string, patch: Partial<UnitInput>): Promise<Unit> {
  await mDelay();
  const unit = db.units.find((u) => u.id === id);
  if (!unit) throw new NotFoundError(id);
  const before = { label: unit.label, type: unit.type, rent: unit.rent, status: unit.status };
  Object.assign(unit, {
    label: patch.label ?? unit.label,
    type: patch.type ?? unit.type,
    bedrooms: patch.type ? BEDROOMS_BY_TYPE[patch.type] : unit.bedrooms,
    floor: patch.floor ?? unit.floor,
    sizeSqm: patch.sizeSqm ?? unit.sizeSqm,
    rent: patch.rent ?? unit.rent,
    status: patch.status ?? unit.status,
    amenities: patch.amenities ?? unit.amenities,
  });
  recordMutation({
    entityType: "unit", entityId: id, entityName: unit.label, action: "updated",
    summary: `Updated unit ${unit.label}`, before, after: { label: unit.label, type: unit.type, rent: unit.rent, status: unit.status },
    notify: { type: "system", title: "Unit updated", body: `Unit ${unit.label} was updated.` },
  });
  return unit;
}

export async function deleteUnit(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.units.findIndex((u) => u.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.units.splice(idx, 1);
  if (removed.leaseId) {
    const lease = db.leases.find((l) => l.id === removed.leaseId);
    if (lease) lease.status = "terminated";
    const tenant = db.tenants.find((t) => t.id === removed.tenantId);
    if (tenant) tenant.status = "past";
  }
  const property = db.properties.find((p) => p.id === removed.propertyId);
  if (property && property.units > 0) property.units -= 1;
  recordMutation({
    entityType: "unit", entityId: id, entityName: removed.label, action: "deleted",
    summary: `Deleted unit ${removed.label} from ${propertyName(removed.propertyId)}`,
    notify: { type: "system", title: "Unit deleted", body: `Unit ${removed.label} was removed.` },
  });
  return { ok: true };
}

export interface UnitDetail {
  unit: Unit;
  tenant: Tenant | undefined;
  lease: Lease | undefined;
  property: Property | undefined;
  tickets: MaintenanceTicket[];
  outstanding: number;
}

export async function getUnitDetail(id: string, scope?: Scope): Promise<UnitDetail> {
  const unit = db.units.find((u) => u.id === id);
  if (!unit) throw new NotFoundError(id);
  const tenant = db.tenants.find((t) => t.id === unit.tenantId);
  const lease = db.leases.find((l) => l.id === unit.leaseId);
  const property = db.properties.find((p) => p.id === unit.propertyId);
  const tickets = db.tickets.filter((t) => t.unitId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const outstanding = db.invoices
    .filter((i) => i.tenantId === unit.tenantId && i.status !== "paid")
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  return respond({ unit, tenant, lease, property, tickets, outstanding }, { error: scope?.forceError });
}

/* ----------------------------------------------------------------- units */

export interface UnitFilter {
  q?: string;
  propertyId?: string;
  status?: string;
  type?: string;
}

export async function listUnits(filter?: UnitFilter, scope?: Scope): Promise<Unit[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.units.filter((u) => ids.has(u.propertyId)) : [...db.units];
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((u) => u.label.toLowerCase().includes(q));
  }
  if (filter?.propertyId && filter.propertyId !== "all") rows = rows.filter((u) => u.propertyId === filter.propertyId);
  if (filter?.status && filter.status !== "all") rows = rows.filter((u) => u.status === filter.status);
  if (filter?.type && filter.type !== "all") rows = rows.filter((u) => u.type === filter.type);
  return respond(rows, { error: scope?.forceError });
}

/* ---------------------------------------------------------------- owners */

export async function listOwners(scope?: Scope): Promise<Owner[]> {
  return respond([...db.owners], { error: scope?.forceError });
}
export async function getOwner(id: string, scope?: Scope): Promise<Owner> {
  const o = db.owners.find((x) => x.id === id);
  if (!o) throw new NotFoundError(id);
  return respond(o, { error: scope?.forceError });
}

/* --------------------------------------------------------------- tenants */

export interface TenantFilter {
  q?: string;
  propertyId?: string;
  status?: string;
}

export async function listTenants(filter?: TenantFilter, scope?: Scope): Promise<Tenant[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.tenants.filter((t) => ids.has(t.propertyId)) : [...db.tenants];
  if (scope?.tenantId) rows = rows.filter((t) => t.id === scope.tenantId);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
  }
  if (filter?.propertyId && filter.propertyId !== "all") rows = rows.filter((t) => t.propertyId === filter.propertyId);
  if (filter?.status && filter.status !== "all") rows = rows.filter((t) => t.status === filter.status);
  return respond(rows, { error: scope?.forceError });
}

export interface TenantDetail {
  tenant: Tenant;
  lease: Lease | undefined;
  unit: Unit | undefined;
  property: Property | undefined;
  invoices: Invoice[];
  payments: Payment[];
  tickets: MaintenanceTicket[];
  communications: CommLog[];
  totals: { paid: number; outstanding: number };
}

export async function getTenant(id: string, scope?: Scope): Promise<TenantDetail> {
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new NotFoundError(id);
  const lease = db.leases.find((l) => l.id === tenant.leaseId);
  const unit = db.units.find((u) => u.id === tenant.unitId);
  const property = db.properties.find((p) => p.id === tenant.propertyId);
  const invoices = db.invoices.filter((i) => i.tenantId === id).sort((a, b) => (a.issued < b.issued ? 1 : -1));
  const payments = db.payments.filter((p) => p.tenantId === id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const tickets = db.tickets.filter((t) => t.tenantId === id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const paid = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paid), 0);
  return respond(
    { tenant, lease, unit, property, invoices, payments, tickets, communications: commsFor("tenant", id), totals: { paid, outstanding } },
    { error: scope?.forceError },
  );
}

/* ---------------------------------------------------------------- leases */

export interface LeaseFilter {
  q?: string;
  status?: string;
  propertyId?: string;
}
export async function listLeases(filter?: LeaseFilter, scope?: Scope): Promise<Lease[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.leases.filter((l) => ids.has(l.propertyId)) : [...db.leases];
  if (scope?.tenantId) rows = rows.filter((l) => l.tenantId === scope.tenantId);
  if (filter?.status && filter.status !== "all") rows = rows.filter((l) => l.status === filter.status);
  if (filter?.propertyId && filter.propertyId !== "all") rows = rows.filter((l) => l.propertyId === filter.propertyId);
  return respond(rows, { error: scope?.forceError });
}

/* --------------------------------------------------------------- finance */

export async function listInvoices(filter?: { status?: string; q?: string }, scope?: Scope): Promise<Invoice[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.invoices.filter((i) => ids.has(i.propertyId)) : [...db.invoices];
  if (scope?.tenantId) rows = rows.filter((i) => i.tenantId === scope.tenantId);
  if (filter?.status && filter.status !== "all") rows = rows.filter((i) => i.status === filter.status);
  if (filter?.q) rows = rows.filter((i) => i.number.toLowerCase().includes(filter.q!.toLowerCase()));
  return respond(rows.sort((a, b) => (a.issued < b.issued ? 1 : -1)), { error: scope?.forceError });
}

export async function listPayments(scope?: Scope): Promise<Payment[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.payments.filter((p) => ids.has(p.propertyId)) : [...db.payments];
  if (scope?.tenantId) rows = rows.filter((p) => p.tenantId === scope.tenantId);
  return respond(rows.sort((a, b) => (a.date < b.date ? 1 : -1)), { error: scope?.forceError });
}

export interface FinanceSummary {
  billed: number;
  collected: number;
  outstanding: number;
  expenses: number;
}

export async function getFinanceSummary(scope?: Scope): Promise<FinanceSummary> {
  const ids = scopedPropertyIds(scope);
  const inv = ids ? db.invoices.filter((i) => ids.has(i.propertyId)) : db.invoices;
  const pay = ids ? db.payments.filter((p) => ids.has(p.propertyId)) : db.payments;
  const exp = ids ? db.expenses.filter((e) => ids.has(e.propertyId)) : db.expenses;
  return respond(
    {
      billed: inv.reduce((s, i) => s + i.amount, 0),
      collected: pay.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0),
      // Mirrors the Dashboard "outstanding" (pending + overdue + partial balances).
      outstanding: inv.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paid), 0),
      expenses: exp.reduce((s, e) => s + e.amount, 0),
    },
    { error: scope?.forceError },
  );
}

export async function listExpenses(scope?: Scope): Promise<Expense[]> {
  const ids = scopedPropertyIds(scope);
  const rows = ids ? db.expenses.filter((e) => ids.has(e.propertyId)) : [...db.expenses];
  return respond(rows.sort((a, b) => (a.date < b.date ? 1 : -1)), { error: scope?.forceError });
}

/* ------------------------------------------------------------ maintenance */

export async function listTickets(filter?: { status?: string; priority?: string; propertyId?: string; q?: string }, scope?: Scope): Promise<MaintenanceTicket[]> {
  const ids = scopedPropertyIds(scope);
  let rows = ids ? db.tickets.filter((t) => ids.has(t.propertyId)) : [...db.tickets];
  if (scope?.tenantId) rows = rows.filter((t) => t.tenantId === scope.tenantId);
  if (filter?.status && filter.status !== "all") rows = rows.filter((t) => t.status === filter.status);
  if (filter?.priority && filter.priority !== "all") rows = rows.filter((t) => t.priority === filter.priority);
  if (filter?.propertyId && filter.propertyId !== "all") rows = rows.filter((t) => t.propertyId === filter.propertyId);
  if (filter?.q) rows = rows.filter((t) => t.title.toLowerCase().includes(filter.q!.toLowerCase()) || t.ref.toLowerCase().includes(filter.q!.toLowerCase()));
  return respond(rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), { error: scope?.forceError });
}

/* -------------------------------------------------------------------- CRM */

export async function listLeads(filter?: { status?: string; q?: string }, scope?: Scope): Promise<Lead[]> {
  let rows = [...db.leads];
  if (filter?.status && filter.status !== "all") rows = rows.filter((l) => l.status === filter.status);
  if (filter?.q) rows = rows.filter((l) => l.name.toLowerCase().includes(filter.q!.toLowerCase()));
  return respond(rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), { error: scope?.forceError });
}
export async function getLead(id: string, scope?: Scope): Promise<Lead> {
  const l = db.leads.find((x) => x.id === id);
  if (!l) throw new NotFoundError(id);
  return respond(l, { error: scope?.forceError });
}

/* ------------------------------------------------------------------ staff */

export async function listStaff(scope?: Scope): Promise<Staff[]> {
  return respond([...db.staff], { error: scope?.forceError });
}

/* --------------------------------------------------------------- lookups */

/** Small helper for filter dropdowns — id/name pairs, never throws/awaits. */
export function propertyOptions(scope?: Scope): { id: string; name: string }[] {
  const ids = scopedPropertyIds(scope);
  return (ids ? db.properties.filter((p) => ids.has(p.id)) : db.properties).map((p) => ({ id: p.id, name: p.name }));
}
export function propertyName(id: string): string {
  return db.properties.find((p) => p.id === id)?.name ?? "—";
}
export function tenantOptions(scope?: Scope): { id: string; name: string }[] {
  const ids = scopedPropertyIds(scope);
  return (ids ? db.tenants.filter((t) => ids.has(t.propertyId)) : db.tenants).map((t) => ({ id: t.id, name: t.name }));
}
export function unitOptions(opts?: { vacantOnly?: boolean }): { id: string; label: string; property: string; rent: number }[] {
  const rows = opts?.vacantOnly ? db.units.filter((u) => u.status === "vacant" || !u.tenantId) : db.units;
  return rows.map((u) => ({ id: u.id, label: `${u.label} · ${db.properties.find((p) => p.id === u.propertyId)?.name ?? ""}`, property: u.propertyId, rent: u.rent }));
}
export function ownerName(id?: string): string {
  return db.owners.find((o) => o.id === id)?.name ?? "—";
}
export function tenantName(id?: string): string {
  return db.tenants.find((t) => t.id === id)?.name ?? "—";
}
export function unitLabel(id?: string): string {
  return db.units.find((u) => u.id === id)?.label ?? "—";
}

/* ============================================================ owners */

const DAY_MS = 86_400_000;
function commsFor(kind: "owner" | "tenant", id: string): CommLog[] {
  const now = new Date(db.NOW_ISO).getTime();
  const owner: { channel: CommLog["channel"]; summary: string; d: number }[] = [
    { channel: "email", summary: "Sent monthly statement and disbursement summary.", d: 3 },
    { channel: "call", summary: "Discussed upcoming lease renewals across the portfolio.", d: 12 },
    { channel: "meeting", summary: "Quarterly portfolio review meeting.", d: 34 },
    { channel: "email", summary: "Shared maintenance report and expense breakdown.", d: 61 },
  ];
  const tenant: { channel: CommLog["channel"]; summary: string; d: number }[] = [
    { channel: "sms", summary: "Rent reminder sent for the current month.", d: 2 },
    { channel: "call", summary: "Followed up on a maintenance request.", d: 9 },
    { channel: "email", summary: "Shared receipt for last month’s payment.", d: 20 },
    { channel: "note", summary: "Tenant reported satisfaction with recent repairs.", d: 45 },
  ];
  const src = kind === "owner" ? owner : tenant;
  return src.map((t, i) => ({ id: `comm_${id}_${i}`, at: new Date(now - t.d * DAY_MS).toISOString(), channel: t.channel, summary: t.summary }));
}

export interface OwnerDetail {
  owner: Owner;
  properties: Property[];
  financials: { monthlyRevenue: number; ytdRevenue: number; outstanding: number; disbursed: number };
  disbursements: { id: string; period: string; gross: number; fees: number; net: number; date: string; status: "paid" | "scheduled" }[];
  communications: CommLog[];
  units: number;
  occupancy: number;
}

export async function getOwnerDetail(id: string, scope?: Scope): Promise<OwnerDetail> {
  const owner = db.owners.find((o) => o.id === id);
  if (!owner) throw new NotFoundError(id);
  const properties = db.properties.filter((p) => owner.propertyIds.includes(p.id));
  const propIds = new Set(properties.map((p) => p.id));
  const monthlyRevenue = properties.reduce((s, p) => s + p.monthlyRevenue, 0);
  const outstanding = db.invoices
    .filter((i) => propIds.has(i.propertyId) && i.status !== "paid")
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const disbursements = months.map((m, i) => {
    const gross = Math.round(monthlyRevenue * (0.9 + i * 0.02));
    const fees = Math.round(gross * 0.08);
    return {
      id: `dsb_${id}_${i}`,
      period: `${m} 2026`,
      gross,
      fees,
      net: gross - fees,
      date: `2026-${String(i + 2).padStart(2, "0")}-05`,
      status: (i < months.length - 1 ? "paid" : "scheduled") as "paid" | "scheduled",
    };
  });
  const ytdRevenue = disbursements.reduce((s, d) => s + d.gross, 0);
  const disbursed = disbursements.filter((d) => d.status === "paid").reduce((s, d) => s + d.net, 0);
  const units = properties.reduce((s, p) => s + p.units, 0);
  const occupancy = properties.length ? Math.round(properties.reduce((s, p) => s + p.occupancy, 0) / properties.length) : 0;
  return respond(
    { owner, properties, financials: { monthlyRevenue, ytdRevenue, outstanding, disbursed }, disbursements, communications: commsFor("owner", id), units, occupancy },
    { error: scope?.forceError },
  );
}

const toM = (n: number) => `${(n / 1_000_000).toFixed(1)}M`;

/** Activity feed scoped to a single owner's properties (payments, completed
 *  maintenance, lease renewals) — read-only, for the Owner portal. */
export async function getOwnerActivity(ownerId: string, scope?: Scope): Promise<Activity[]> {
  const owner = db.owners.find((o) => o.id === ownerId);
  const propIds = new Set(owner?.propertyIds ?? []);
  const acts: Activity[] = [];
  db.payments
    .filter((p) => propIds.has(p.propertyId) && p.status === "completed")
    .slice(0, 6)
    .forEach((p, i) => {
      const t = db.tenants.find((x) => x.id === p.tenantId);
      acts.push({ id: `oa_pay_${i}`, at: p.date, kind: "payment", text: `Rent received — UGX ${toM(p.amount)} from ${t?.name ?? "tenant"} (${propertyName(p.propertyId)})` });
    });
  db.tickets
    .filter((tk) => propIds.has(tk.propertyId) && (tk.status === "completed" || tk.status === "closed"))
    .slice(0, 4)
    .forEach((tk, i) => {
      acts.push({ id: `oa_tkt_${i}`, at: tk.updatedAt, kind: "ticket", text: `Maintenance completed — ${tk.title} (${propertyName(tk.propertyId)})` });
    });
  db.leases
    .filter((l) => propIds.has(l.propertyId) && l.status === "active")
    .slice(0, 3)
    .forEach((l, i) => {
      const t = db.tenants.find((x) => x.id === l.tenantId);
      acts.push({ id: `oa_lse_${i}`, at: l.start, kind: "lease", text: `Lease active — ${t?.name ?? "tenant"} at ${propertyName(l.propertyId)}` });
    });
  return respond(acts.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8), { error: scope?.forceError });
}

export interface OwnerFinancials {
  series: { label: string; revenue: number; expenses: number; net: number }[];
  feeBreakdown: { grossRevenue: number; feeRate: number; managementFee: number; otherDeductions: number; netDisbursement: number };
  perProperty: { id: string; name: string; revenue: number; fee: number; expenses: number; net: number }[];
  totals: { revenue: number; expenses: number; fee: number; net: number };
}

const FEE_RATE = 0.08; // Nexora management fee — matches getOwnerDetail disbursements.

/** Owner financials: revenue vs expenses over time, management-fee breakdown,
 *  net disbursement and a per-property table. Derives from the same property
 *  revenue + 8% fee as getOwnerDetail, so the headline numbers reconcile. */
export async function getOwnerFinancials(ownerId: string, scope?: Scope): Promise<OwnerFinancials> {
  const owner = db.owners.find((o) => o.id === ownerId);
  if (!owner) throw new NotFoundError(ownerId);
  const properties = db.properties.filter((p) => owner.propertyIds.includes(p.id));

  const perProperty = properties.map((p) => {
    const revenue = p.monthlyRevenue;
    const fee = Math.round(revenue * FEE_RATE);
    const expenses = db.expenses.filter((e) => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { id: p.id, name: p.name, revenue, fee, expenses, net: revenue - fee - expenses };
  });

  const grossRevenue = perProperty.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = perProperty.reduce((s, p) => s + p.expenses, 0);
  const managementFee = Math.round(grossRevenue * FEE_RATE);
  const netDisbursement = grossRevenue - managementFee - totalExpenses;

  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const series = months.map((m, i) => {
    const revenue = Math.round(grossRevenue * (0.9 + i * 0.02));
    const expenses = Math.round((totalExpenses / months.length) * (0.85 + i * 0.05));
    return { label: m, revenue, expenses, net: revenue - Math.round(revenue * FEE_RATE) - expenses };
  });

  return respond(
    {
      series,
      feeBreakdown: { grossRevenue, feeRate: FEE_RATE, managementFee, otherDeductions: totalExpenses, netDisbursement },
      perProperty,
      totals: { revenue: grossRevenue, expenses: totalExpenses, fee: managementFee, net: netDisbursement },
    },
    { error: scope?.forceError },
  );
}

/* ============================================================ leases (mutations) */

export async function renewLease(id: string, months = 12): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 500));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const end = new Date(lease.end);
  end.setMonth(end.getMonth() + months);
  lease.end = end.toISOString();
  lease.status = "active";
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  if (tenant && tenant.status !== "past") tenant.status = "active";
  recordMutation({
    entityType: "lease",
    entityId: id,
    entityName: tenant?.name ?? id,
    action: "renewed",
    summary: `Renewed lease for ${tenant?.name ?? "tenant"} by ${months} months`,
    notify: { type: "lease", title: "Lease renewed", body: `${tenant?.name ?? "A tenant"}'s lease was renewed for ${months} months.` },
  });
  return lease;
}

export async function terminateLease(id: string): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 500));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  lease.status = "terminated";
  const unit = db.units.find((u) => u.id === lease.unitId);
  if (unit) unit.status = "vacant";
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  if (tenant) tenant.status = "past";
  recordMutation({
    entityType: "lease",
    entityId: id,
    entityName: tenant?.name ?? id,
    action: "terminated",
    summary: `Terminated lease for ${tenant?.name ?? "tenant"}; unit ${unit?.label ?? ""} released`,
    notify: { type: "lease", title: "Lease terminated", body: `${tenant?.name ?? "A tenant"}'s lease was terminated.` },
  });
  return lease;
}

/* ============================================================ maintenance (mutations) */

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<MaintenanceTicket> {
  await new Promise((r) => setTimeout(r, 350));
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  t.status = status;
  t.updatedAt = db.NOW_ISO;
  if (status !== "open" && !t.assignee) t.assignee = "James Odoi";
  return t;
}

export async function updateTicket(
  id: string,
  patch: { status?: TicketStatus; assignee?: string; cost?: number },
): Promise<MaintenanceTicket> {
  await new Promise((r) => setTimeout(r, 400));
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  const before = { status: t.status, assignee: t.assignee, cost: t.cost };
  if (patch.status) t.status = patch.status;
  if (patch.assignee !== undefined) t.assignee = patch.assignee || undefined;
  if (patch.cost !== undefined) t.cost = patch.cost || undefined;
  if (t.status !== "open" && !t.assignee) t.assignee = "James Odoi";
  t.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket",
    entityId: id,
    entityName: t.ref,
    action: "status_changed",
    summary: `Ticket ${t.ref} → ${t.status.replace("_", " ")}${t.assignee ? ` (${t.assignee})` : ""}`,
    before,
    after: { status: t.status, assignee: t.assignee, cost: t.cost },
    notify: { type: "maintenance", title: "Ticket updated", body: `${t.ref} — ${t.title} is now ${t.status.replace("_", " ")}.` },
  });
  return t;
}

export async function assignTicket(id: string, assignee: string): Promise<MaintenanceTicket> {
  await new Promise((r) => setTimeout(r, 350));
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  t.assignee = assignee;
  if (t.status === "open") t.status = "assigned";
  t.updatedAt = db.NOW_ISO;
  return t;
}

/* ============================================================ finance (mutations) */

export async function createInvoice(input: { tenantId: string; amount: number; due: string; kind: Invoice["kind"] }): Promise<Invoice> {
  await new Promise((r) => setTimeout(r, 500));
  const tenant = db.tenants.find((t) => t.id === input.tenantId);
  const seq = db.invoices.length + 1;
  const inv: Invoice = {
    id: `inv_${seq}`,
    number: `INV-2026-${String(seq).padStart(4, "0")}`,
    leaseId: tenant?.leaseId ?? "",
    tenantId: input.tenantId,
    propertyId: tenant?.propertyId ?? "",
    kind: input.kind,
    issued: db.NOW_ISO,
    due: input.due,
    amount: input.amount,
    paid: 0,
    status: "pending",
  };
  db.invoices.unshift(inv);
  recordMutation({
    entityType: "invoice",
    entityId: inv.id,
    entityName: inv.number,
    action: "created",
    summary: `Generated ${inv.number} for ${tenant?.name ?? "tenant"} — ${inv.amount.toLocaleString("en-UG")} UGX`,
    after: { number: inv.number, amount: inv.amount, status: inv.status },
    notify: { type: "payment", title: "Invoice generated", body: `${inv.number} was raised for ${tenant?.name ?? "a tenant"}.` },
  });
  return inv;
}

export async function createExpense(input: { propertyId: string; category: ExpenseCategory; vendor: string; amount: number; description: string }): Promise<Expense> {
  await new Promise((r) => setTimeout(r, 500));
  const exp: Expense = {
    id: `exp_${db.expenses.length + 1}`,
    propertyId: input.propertyId,
    category: input.category,
    vendor: input.vendor,
    description: input.description,
    amount: input.amount,
    date: db.NOW_ISO,
    status: "pending",
  };
  db.expenses.unshift(exp);
  recordMutation({
    entityType: "expense",
    entityId: exp.id,
    entityName: exp.vendor,
    action: "created",
    summary: `Logged ${exp.category} expense — ${exp.amount.toLocaleString("en-UG")} UGX (${exp.vendor})`,
    after: { category: exp.category, amount: exp.amount, vendor: exp.vendor },
    notify: { type: "system", title: "Expense logged", body: `${exp.amount.toLocaleString("en-UG")} UGX logged for ${propertyName(exp.propertyId)}.` },
  });
  return exp;
}

/* ============================================================ CRM (mutations) */

export async function addLeadActivity(id: string, kind: LeadActivity["kind"], text: string): Promise<Lead> {
  await new Promise((r) => setTimeout(r, 400));
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) throw new NotFoundError(id);
  lead.activities = [
    ...lead.activities,
    { id: `act_${id}_${lead.activities.length}`, at: db.NOW_ISO, kind, text },
  ];
  recordMutation({
    entityType: "lead",
    entityId: id,
    entityName: lead.name,
    action: "updated",
    summary: `Logged ${kind} on lead ${lead.name}`,
    notify: false,
  });
  return lead;
}

/* ============================================================ announcements */

export async function listAnnouncements(scope?: Scope): Promise<Announcement[]> {
  return respond([...db.announcements].sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1)), { error: scope?.forceError });
}

export async function createAnnouncement(input: { title: string; body: string; audience: AudienceKind; audienceLabel: string; channels: BroadcastChannel[] }): Promise<Announcement> {
  await new Promise((r) => setTimeout(r, 600));
  const recipients =
    input.audience === "owners" ? db.owners.length : input.audience === "property" ? Math.round(db.tenants.length / 3) : db.tenants.length;
  const ann: Announcement = {
    id: `ann_${db.announcements.length + 1}`,
    title: input.title,
    body: input.body,
    audience: input.audience,
    audienceLabel: input.audienceLabel,
    channels: input.channels,
    recipients,
    sentAt: db.NOW_ISO,
    sentBy: "You",
  };
  db.announcements.unshift(ann);
  recordMutation({
    entityType: "announcement",
    entityId: ann.id,
    entityName: ann.title,
    action: "sent",
    summary: `Sent announcement "${ann.title}" to ${ann.audienceLabel} (${ann.recipients} recipients)`,
    after: { audience: ann.audienceLabel, recipients: ann.recipients },
    notify: { type: "announcement", title: "Announcement sent", body: `"${ann.title}" was broadcast to ${ann.audienceLabel}.` },
  });
  return ann;
}

/* ============================================================ analytics */

export interface Analytics {
  occupancyRate: number;
  collectionRate: number;
  arrears: number;
  avgResolutionDays: number;
  retentionRate: number;
  revenueByProperty: { name: string; value: number }[];
  occupancyByCategory: { name: string; value: number }[];
  collectionTrend: { label: string; value: number }[];
}

export async function getAnalytics(scope?: Scope): Promise<Analytics> {
  const props = db.properties;
  const occupancyRate = Math.round(props.reduce((s, p) => s + p.occupancy, 0) / props.length);
  const invoicesDue = db.invoices.reduce((s, i) => s + i.amount, 0);
  const invoicesPaid = db.invoices.reduce((s, i) => s + i.paid, 0);
  const collectionRate = Math.round((invoicesPaid / invoicesDue) * 100);
  const arrears = invoicesDue - invoicesPaid;
  const completed = db.tickets.filter((t) => t.status === "completed" || t.status === "closed");
  const avgResolutionDays = Math.round(
    completed.reduce((s, t) => s + Math.max(1, (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 86_400_000), 0) /
      Math.max(1, completed.length),
  );
  const retentionRate = 100 - Math.round((db.tenants.filter((t) => t.status === "past").length / db.tenants.length) * 100);
  const revenueByProperty = [...props]
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 8)
    .map((p) => ({ name: p.name, value: Math.round(p.monthlyRevenue / 1_000_000) }));
  const cats = ["Residential", "Commercial", "Condominiums", "Institutional", "Managed Facilities"];
  const occupancyByCategory = cats
    .map((c) => {
      const inCat = props.filter((p) => p.category === c);
      return { name: c, value: inCat.length ? Math.round(inCat.reduce((s, p) => s + p.occupancy, 0) / inCat.length) : 0 };
    })
    .filter((x) => x.value > 0);
  const collectionTrend = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m, i) => ({ label: m, value: Math.min(99, 82 + i * 2 + (i % 2)) }));
  return respond(
    { occupancyRate, collectionRate, arrears, avgResolutionDays, retentionRate, revenueByProperty, occupancyByCategory, collectionTrend },
    { error: scope?.forceError },
  );
}

/* ============================================================ roles (read) */

export async function listRoles(scope?: Scope): Promise<import("@/lib/mock/types").RoleDef[]> {
  return respond([...db.roleDefs], { error: scope?.forceError });
}

/* ============================================================ wallet (read) */

export interface WalletSummary {
  balance: number;
  received: number;
  withdrawn: number;
  pending: number;
  trend: Series[];
}

export async function getWallet(scope?: Scope): Promise<WalletSummary> {
  const received = db.walletTransactions.filter((t) => (t.type === "deposit" || t.type === "refund") && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const withdrawn = db.walletTransactions.filter((t) => (t.type === "withdrawal" || t.type === "disbursement" || t.type === "fee") && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const pending = db.walletTransactions.filter((t) => t.status === "pending").reduce((s, t) => s + t.amount, 0);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const trend = months.map((m, i) => ({ label: m, value: Math.round((db.wallet.balance * (0.78 + i * 0.045)) / 1_000_000) }));
  return respond({ balance: db.wallet.balance, received, withdrawn, pending, trend }, { error: scope?.forceError });
}

export async function listTransactions(filter?: { type?: string; status?: string }, scope?: Scope): Promise<import("@/lib/mock/types").WalletTx[]> {
  let rows = [...db.walletTransactions];
  if (filter?.type && filter.type !== "all") rows = rows.filter((t) => t.type === filter.type);
  if (filter?.status && filter.status !== "all") rows = rows.filter((t) => t.status === filter.status);
  return respond(rows.sort((a, b) => (a.date < b.date ? 1 : -1)), { error: scope?.forceError });
}

export async function listBankAccounts(scope?: Scope): Promise<import("@/lib/mock/types").BankAccount[]> {
  return respond([...db.bankAccounts], { error: scope?.forceError });
}

/** Owners as recipient options for disbursements (id + name). */
export function ownerOptions(): { id: string; name: string }[] {
  return db.owners.map((o) => ({ id: o.id, name: o.name }));
}

export * from "./admin-mutations";
