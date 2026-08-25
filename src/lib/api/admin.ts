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
import { incrementStaffJobs, pushNotify, staffRef, resolveStaff } from "@/lib/api/admin-mutations";
import { leaseView } from "@/lib/lease";
import { roleLabels, type Role } from "@/lib/roles";
import { monthlyCommission, effectiveRate, agreementRateLabel, CONTRACT_TYPE_LABEL } from "@/lib/api/agreements";
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
  StaffAvailability,
  StaffType,
  Tenant,
  TicketStatus,
  Unit,
  UnitStatus,
  UnitType,
} from "@/lib/mock/types";

export type { Activity, Announcement, AudienceKind, BroadcastChannel, CommLog, Expense, ExpenseCategory, Invoice, Lead, LeadActivity, Lease, MaintenanceTicket, Owner, Payment, Property, Staff, Tenant, Unit };
export type { Building, LeaseStatus, InvoiceStatus, TicketStatus, TicketPriority, UnitStatus, UnitType, PropertyStatus, TicketCategory, PaymentMethod, LeadStatus, StaffDepartment, StaffAvailability, StaffType } from "@/lib/mock/types";
export type { RoleDef, PermissionSet } from "@/lib/mock/types";
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
  const expiring = db.leases
    .map((l) => ({ l, v: leaseView(l, db.NOW_ISO) }))
    .filter((x) => x.v.expiringSoon && inScope(x.l.propertyId))
    .sort((a, b) => a.v.daysToExpiry - b.v.daysToExpiry)
    .slice(0, 4);
  for (const { l, v } of expiring) {
    const t = db.tenants.find((x) => x.id === l.tenantId);
    const u = db.units.find((x) => x.id === l.unitId);
    alerts.push({ id: `al_${l.id}`, kind: "lease", severity: "warning", text: `${t?.name ?? "Tenant"} — ${u?.label ?? "unit"} — expires in ${Math.max(0, v.daysToExpiry)} days`, href: "/admin/leases" });
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
  /* richer 7-step config */
  description?: string;
  bathrooms?: number;
  buildingsConfig?: { name: string; floors: number }[];
  videos?: string[];
  floorPlans?: string[];
  documents?: string[];
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
  if (input.description != null) out.description = input.description;
  if (input.bathrooms != null) out.bathrooms = input.bathrooms;
  if (input.videos) out.videos = input.videos;
  if (input.floorPlans) out.floorPlans = input.floorPlans;
  if (input.documents) out.documents = input.documents;
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
  const buildings = input.buildingsConfig?.length
    ? input.buildingsConfig.map((b, i) => ({ id: `bld_${id}_${i + 1}`, name: b.name || `Block ${String.fromCharCode(65 + i)}`, floors: Math.max(1, b.floors), units: Math.max(1, b.floors) }))
    : [{ id: `bld_${id}_1`, name: "Main Block", floors: Math.max(1, Math.ceil(input.units / 4)), units: input.units }];
  const totalUnits = input.buildingsConfig?.length ? buildings.reduce((s, b) => s + b.units, 0) : input.units;
  const property: Property = {
    id,
    name: input.name,
    location: input.location,
    category: input.category,
    image: input.image ?? "/images/properties/apartment-facade.jpg",
    ownerId: input.ownerId ?? db.owners[0]?.id ?? "own_salim",
    status: input.status ?? "onboarding",
    units: totalUnits,
    occupancy: 0,
    monthlyRevenue: 0,
    buildings,
    since: db.NOW_ISO,
    rentalType: input.rentalType ?? "long-term",
    rentalPayment: input.rentalPayment ?? (input.rentalType === "short-term" ? "online" : "manual"),
    amenities: input.amenities ?? [],
    bedrooms: input.bedrooms ?? 0,
    availableUnits: totalUnits,
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
  let buildings = property.buildings;
  let units = patch.units ?? property.units;
  if (patch.buildingsConfig?.length) {
    buildings = patch.buildingsConfig.map((b, i) => ({ id: `bld_${property.id}_${i + 1}`, name: b.name || `Block ${String.fromCharCode(65 + i)}`, floors: Math.max(1, b.floors), units: Math.max(1, b.floors) }));
    units = buildings.reduce((s, b) => s + b.units, 0);
  }
  Object.assign(property, {
    name: patch.name ?? property.name,
    location: patch.location ?? property.location,
    category: patch.category ?? property.category,
    units,
    buildings,
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
  // Filter on the COMPUTED display status so "Expiring Soon" / "Expired" match
  // date-driven transitions (see lib/lease.ts), while explicit statuses pass through.
  if (filter?.status && filter.status !== "all") {
    rows = rows.filter((l) => leaseView(l, db.NOW_ISO).status === filter.status);
  }
  if (filter?.propertyId && filter.propertyId !== "all") rows = rows.filter((l) => l.propertyId === filter.propertyId);
  return respond(rows, { error: scope?.forceError });
}

export interface LeaseDetail {
  lease: Lease;
  tenant?: Tenant;
  unit?: Unit;
  property?: Property;
  outstandingRent: number;
}

/** Single lease with related records + outstanding rent (for the move-out flow). */
export async function getLeaseDetail(id: string, scope?: Scope): Promise<LeaseDetail> {
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  const unit = db.units.find((u) => u.id === lease.unitId);
  const property = db.properties.find((p) => p.id === lease.propertyId);
  const outstandingRent = db.invoices
    .filter((i) => i.tenantId === lease.tenantId && i.status !== "paid")
    .reduce((s, i) => s + (i.amount - i.paid), 0);
  return respond({ lease, tenant, unit, property, outstandingRent }, { error: scope?.forceError });
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

export interface StaffOption {
  id: string;
  name: string;
  role?: Role;
  availability: StaffAvailability;
  jobTitle?: string;
  department?: string;
  staffType: StaffType;
  /** "Fred Wanyama — Plumbing Technician · Busy" — ready for a dropdown. */
  label: string;
}

const AVAIL_LABEL: Record<StaffAvailability, string> = {
  available: "Available", busy: "Busy", off: "On leave", on_leave: "On leave",
};

/**
 * THE central staff directory for every assignment dropdown (maintenance tickets,
 * service bookings, move-out inspections). No module may hardcode staff names.
 *
 * `departments` narrows to operational staff in those departments; `roles` additionally
 * admits system users holding one of those platform roles (e.g. a Maintenance Officer
 * can still be assigned a ticket). Called with no filter it returns all active staff,
 * preserving the Revision B behaviour.
 */
export function staffOptions(filter?: { departments?: string[]; roles?: Role[] }): StaffOption[] {
  const rows = db.staff.filter((s) => s.status === "active").filter((s) => {
    if (!filter) return true;
    const isOps = (s.staffType ?? "system_user") === "operational_staff";
    if (isOps) return filter.departments ? filter.departments.includes(s.department ?? "") : false;
    return filter.roles ? !!s.role && filter.roles.includes(s.role) : false;
  });
  return rows.map((s) => {
    const availability = (s.availability ?? "available") as StaffAvailability;
    const detail = s.jobTitle ?? (s.role ? roleLabels[s.role] : s.department ?? "Staff");
    return {
      id: s.id, name: s.name, role: s.role, availability,
      jobTitle: s.jobTitle, department: s.department,
      staffType: (s.staffType ?? "system_user") as StaffType,
      label: `${s.name} — ${detail} · ${AVAIL_LABEL[availability]}`,
    };
  });
}

/** Operational staff eligible for a service booking, filtered by service type. */
export function serviceStaffFor(kind: string, category?: string): StaffOption[] {
  const c = (category ?? "").toLowerCase();
  const dept =
    c.includes("laundry") ? "laundry"
    : c.includes("car wash") || c.includes("carwash") ? "car_wash"
    : kind === "cleaning" || c.includes("clean") ? "cleaning"
    : null;
  // Unmatched services (gardening, janitorial…) can go to any active field worker.
  const opts = dept ? staffOptions({ departments: [dept] }) : [];
  return opts.length
    ? opts
    : staffOptions().filter((s) => s.staffType === "operational_staff");
}

/** Staff assignable to a maintenance ticket: maintenance crew + Maintenance Officers. */
export function maintenanceStaff(): StaffOption[] {
  return staffOptions({ departments: ["maintenance"], roles: ["maintenance_officer"] });
}

export interface StaffAssignment {
  id: string;
  kind: "maintenance" | "service";
  ref: string;
  title: string;
  status: string;
  date: string;
}

export interface StaffDetail {
  member: Staff;
  assignments: StaffAssignment[];
  performance: {
    totalJobs: number;
    completed: number;
    active: number;
    completionRate: number; // %
    avgPerMonth: number;
  };
}

/** Staff member with derived assignments (maintenance tickets + service
 *  bookings assigned by name) and performance metrics. */
export async function getStaffMember(id: string, scope?: Scope): Promise<StaffDetail> {
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new NotFoundError(id);
  const tickets: StaffAssignment[] = db.tickets
    .filter((t) => (t.assigneeId ? t.assigneeId === member.id : t.assignee === member.name))
    .map((t) => ({ id: t.id, kind: "maintenance", ref: t.ref, title: t.title, status: t.status, date: t.updatedAt }));
  const services: StaffAssignment[] = db.serviceBookings
    .filter((b) => (b.assigneeId ? b.assigneeId === member.id : b.assignee === member.name))
    .map((b) => ({ id: b.id, kind: "service", ref: b.reference, title: `${b.category} — ${b.name}`, status: b.status, date: b.date }));
  const assignments = [...tickets, ...services].sort((a, b) => (a.date < b.date ? 1 : -1));
  const completed = assignments.filter((a) => a.status === "completed" || a.status === "closed").length;
  const active = assignments.filter((a) => a.status !== "completed" && a.status !== "closed" && a.status !== "cancelled").length;
  const totalJobs = Math.max(assignments.length, member.assignedJobs ?? 0);
  const monthsOnTeam = Math.max(1, Math.round((Date.now() - new Date(member.since).getTime()) / (30 * DAY_MS)));
  return respond(
    {
      member,
      assignments,
      performance: {
        totalJobs,
        completed,
        active,
        completionRate: assignments.length ? Math.round((completed / assignments.length) * 100) : 0,
        avgPerMonth: Math.round((totalJobs / monthsOnTeam) * 10) / 10,
      },
    },
    { error: scope?.forceError },
  );
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
  const ownerAgreement = db.getAgreementForOwner(id);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const disbursements = months.map((m, i) => {
    const gross = Math.round(monthlyRevenue * (0.9 + i * 0.02));
    const fees = ownerAgreement ? monthlyCommission(ownerAgreement, gross) : 0;
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

/* -------------------------------------------------- owner dashboard snapshot */

export interface OwnerSnapshot {
  units: { total: number; occupied: number; vacant: number; notice: number; maintenance: number };
  settlement: {
    nextPeriod: string | null;
    nextNet: number;
    nextDate: string | null;
    paidToDate: number;
    pending: number;
  };
  transactions: {
    id: string;
    date: string;
    type: "rent_in" | "disbursement";
    label: string;
    amount: number;
    direction: "in" | "out";
    status: string;
  }[];
}

/**
 * Read-only snapshot for the Owner dashboard: unit occupancy split, the next
 * pending settlement vs what's already been paid, and a merged transaction feed
 * (rent received in, disbursements out). Settlement figures use the SAME
 * disbursement model as `getOwnerDetail`, so the two reconcile exactly.
 */
export async function getOwnerSnapshot(ownerId: string, scope?: Scope): Promise<OwnerSnapshot> {
  const owner = db.owners.find((o) => o.id === ownerId);
  if (!owner) throw new NotFoundError(ownerId);
  const propIds = new Set(owner.propertyIds);
  const properties = db.properties.filter((p) => propIds.has(p.id));
  const units = db.units.filter((u) => propIds.has(u.propertyId));
  const count = (s: UnitStatus) => units.filter((u) => u.status === s).length;

  // Settlement — mirror getOwnerDetail's disbursement schedule.
  const monthlyRevenue = properties.reduce((s, p) => s + p.monthlyRevenue, 0);
  const agreement = db.getAgreementForOwner(ownerId);
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const disbursements = months.map((m, i) => {
    const gross = Math.round(monthlyRevenue * (0.9 + i * 0.02));
    const fees = agreement ? monthlyCommission(agreement, gross) : 0;
    return {
      id: `dsb_${ownerId}_${i}`,
      period: `${m} 2026`,
      net: gross - fees,
      date: `2026-${String(i + 2).padStart(2, "0")}-05`,
      status: (i < months.length - 1 ? "paid" : "scheduled") as "paid" | "scheduled",
    };
  });
  const paid = disbursements.filter((d) => d.status === "paid");
  const next = disbursements.find((d) => d.status === "scheduled") ?? null;
  const paidToDate = paid.reduce((s, d) => s + d.net, 0);

  // Merged transaction feed — completed rent payments in, disbursements out.
  const rentIn = db.payments
    .filter((p) => propIds.has(p.propertyId) && p.status === "completed")
    .map((p) => {
      const t = db.tenants.find((x) => x.id === p.tenantId);
      return {
        id: `tx_${p.id}`,
        date: p.date,
        type: "rent_in" as const,
        label: `Rent — ${t?.name ?? "tenant"} · ${propertyName(p.propertyId)}`,
        amount: p.amount,
        direction: "in" as const,
        status: "completed",
      };
    });
  const disbOut = disbursements.map((d) => ({
    id: `tx_${d.id}`,
    date: d.date,
    type: "disbursement" as const,
    label: `Disbursement — ${d.period}`,
    amount: d.net,
    direction: "out" as const,
    status: d.status === "paid" ? "paid" : "pending",
  }));
  const transactions = [...rentIn, ...disbOut].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return respond(
    {
      units: {
        total: units.length,
        occupied: count("occupied"),
        vacant: count("vacant"),
        notice: count("notice"),
        maintenance: count("maintenance"),
      },
      settlement: {
        nextPeriod: next?.period ?? null,
        nextNet: next?.net ?? 0,
        nextDate: next?.date ?? null,
        paidToDate,
        pending: next?.net ?? 0,
      },
      transactions,
    },
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
  feeBreakdown: { grossRevenue: number; feeRate: number; managementFee: number; otherDeductions: number; netDisbursement: number; agreementType?: string; agreementLabel?: string };
  perProperty: { id: string; name: string; revenue: number; fee: number; expenses: number; net: number }[];
  totals: { revenue: number; expenses: number; fee: number; net: number };
}

/** Owner financials: revenue vs expenses over time, management-fee breakdown,
 *  net disbursement and a per-property table. The management fee derives ENTIRELY
 *  from the owner's active agreement (no hardcoded rate), so it reconciles with
 *  getOwnerDetail and the Financial Overview. */
export async function getOwnerFinancials(ownerId: string, scope?: Scope): Promise<OwnerFinancials> {
  const owner = db.owners.find((o) => o.id === ownerId);
  if (!owner) throw new NotFoundError(ownerId);
  const properties = db.properties.filter((p) => owner.propertyIds.includes(p.id));
  const agreement = db.getAgreementForOwner(ownerId);
  const feeOf = (gross: number) => (agreement ? monthlyCommission(agreement, gross) : 0);

  const perProperty = properties.map((p) => {
    const revenue = p.monthlyRevenue;
    const fee = feeOf(revenue);
    const expenses = db.expenses.filter((e) => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    return { id: p.id, name: p.name, revenue, fee, expenses, net: revenue - fee - expenses };
  });

  const grossRevenue = perProperty.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = perProperty.reduce((s, p) => s + p.expenses, 0);
  const managementFee = feeOf(grossRevenue);
  const netDisbursement = grossRevenue - managementFee - totalExpenses;
  const feeRate = agreement ? effectiveRate(agreement, grossRevenue) : 0;

  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const series = months.map((m, i) => {
    const revenue = Math.round(grossRevenue * (0.9 + i * 0.02));
    const expenses = Math.round((totalExpenses / months.length) * (0.85 + i * 0.05));
    return { label: m, revenue, expenses, net: revenue - feeOf(revenue) - expenses };
  });

  return respond(
    {
      series,
      feeBreakdown: {
        grossRevenue, feeRate, managementFee, otherDeductions: totalExpenses, netDisbursement,
        agreementType: agreement ? CONTRACT_TYPE_LABEL[agreement.contractType] : undefined,
        agreementLabel: agreement ? `${CONTRACT_TYPE_LABEL[agreement.contractType]} — ${agreementRateLabel(agreement)}` : undefined,
      },
      perProperty,
      totals: { revenue: grossRevenue, expenses: totalExpenses, fee: managementFee, net: netDisbursement },
    },
    { error: scope?.forceError },
  );
}

/* ============================================================ leases (mutations) */

const _money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;
const _dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export async function renewLease(id: string, months = 12): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 500));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const end = new Date(lease.end);
  end.setMonth(end.getMonth() + months);
  lease.end = end.toISOString();
  lease.status = "active";
  lease.renewalRequestedAt = undefined;
  lease.renewalRequestedEnd = undefined;
  lease.renewalNotes = undefined;
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  if (tenant && tenant.status !== "past") tenant.status = "active";
  const propName = propertyName(lease.propertyId);
  recordMutation({
    entityType: "lease",
    entityId: id,
    entityName: tenant?.name ?? id,
    action: "renewed",
    summary: `Renewed lease for ${tenant?.name ?? "tenant"} by ${months} months`,
    notify: { type: "lease", title: "Lease renewed", body: `${tenant?.name ?? "A tenant"}'s lease was renewed for ${months} months.` },
  });
  // C6 — notify tenant + owner.
  pushNotify("lease", "Your lease has been renewed!", `Your lease has been renewed. New end date: ${_dateOf(lease.end)}. Updated rent: ${_money(lease.rent)}.`, "lease", id, "renewed");
  pushNotify("lease", "Lease renewed", `Lease renewed at ${unitLabel(lease.unitId)}, ${propName}. Tenant: ${tenant?.name ?? "tenant"}. New end date: ${_dateOf(lease.end)}.`, "lease", id, "renewed");
  return lease;
}

/** C1 — nudge the tenant about an upcoming expiry (no status change). */
export async function sendRenewalReminder(id: string): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 300));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const view = leaseView(lease, db.NOW_ISO);
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "updated",
    summary: `Sent renewal reminder to ${tenant?.name ?? "tenant"} (${Math.max(0, view.daysToExpiry)} days to expiry)`,
    notify: false,
  });
  pushNotify("lease", "Your lease is expiring soon", `Your lease at ${unitLabel(lease.unitId)} expires in ${Math.max(0, view.daysToExpiry)} days. Contact Nexora about renewal.`, "lease", id, "updated");
  return lease;
}

/** C5 — tenant-initiated renewal request. */
export async function requestLeaseRenewal(id: string, input: { preferredEnd: string; notes?: string }): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 400));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  lease.status = "renewal_requested";
  lease.renewalRequestedAt = db.NOW_ISO;
  lease.renewalRequestedEnd = input.preferredEnd;
  lease.renewalNotes = input.notes;
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  const propName = propertyName(lease.propertyId);
  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "updated",
    summary: `Tenant initiated lease renewal request (preferred end ${_dateOf(input.preferredEnd)})`,
    after: { status: "renewal_requested", preferredEnd: input.preferredEnd },
    notify: { type: "lease", title: "Renewal requested", body: `Tenant ${tenant?.name ?? "a tenant"} has requested lease renewal for ${unitLabel(lease.unitId)}, ${propName}. Preferred new end date: ${_dateOf(input.preferredEnd)}.${input.notes ? ` Notes: ${input.notes}` : ""}` },
  });
  pushNotify("lease", "Renewal request submitted", "Your renewal request has been submitted. Nexora will review and contact you.", "lease", id, "updated");
  return lease;
}

/* ---------------------------------------------------- deposit settlement */

export type DepositOutcome = "full_refund" | "partial_refund" | "deduct" | "forfeit";

export interface DepositOutcomeInput {
  outcome: DepositOutcome;
  refundAmount?: number;
  deductionAmount?: number;
  reason?: string;
  additionalOwed?: number;
  exitDate?: string;
  terminationReason?: string;
}

const DEPOSIT_LABEL: Record<string, string> = {
  refunded: "Refunded", partially_refunded: "Partially Refunded", deducted: "Deducted", forfeited: "Forfeited", held: "Held",
};

/** Apply a deposit outcome onto the lease record; returns the resolved status. */
function applyDepositOutcome(lease: Lease, d: DepositOutcomeInput) {
  lease.depositSettledAt = db.NOW_ISO;
  lease.depositReason = d.reason;
  if (d.outcome === "full_refund") {
    lease.depositStatus = "refunded"; lease.depositRefundAmount = lease.deposit; lease.depositDeductionAmount = 0;
  } else if (d.outcome === "partial_refund") {
    const refund = Math.max(0, Math.min(lease.deposit, d.refundAmount ?? 0));
    lease.depositStatus = "partially_refunded"; lease.depositRefundAmount = refund; lease.depositDeductionAmount = lease.deposit - refund;
  } else if (d.outcome === "deduct") {
    lease.depositStatus = "deducted"; lease.depositDeductionAmount = d.deductionAmount ?? lease.deposit; lease.depositRefundAmount = 0; lease.depositAdditionalOwed = d.additionalOwed;
  } else {
    lease.depositStatus = "forfeited"; lease.depositDeductionAmount = lease.deposit; lease.depositRefundAmount = 0;
  }
  return lease.depositStatus;
}

/** Record a Finance expense for a deposit deduction, linked to the property. */
function addDepositExpense(propertyId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const exp: Expense = {
    id: `exp_dep_${db.expenses.length + 1}_${Date.now()}`,
    propertyId,
    category: "admin",
    vendor: "Deposit Settlement",
    description: `Deposit Deduction — ${reason}`,
    amount,
    date: db.NOW_ISO,
    status: "approved",
  };
  db.expenses.unshift(exp);
}

export async function terminateLease(id: string, deposit?: DepositOutcomeInput): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 500));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const d: DepositOutcomeInput = deposit ?? { outcome: "full_refund" };
  lease.status = "terminated";
  const unit = db.units.find((u) => u.id === lease.unitId);
  if (unit) unit.status = "vacant";
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  if (tenant) tenant.status = "past";
  const status = applyDepositOutcome(lease, d);
  const propName = propertyName(lease.propertyId);

  // Deduction / partial refund → book an expense against the property.
  const deduction = lease.depositDeductionAmount ?? 0;
  if ((status === "partially_refunded" || status === "deducted") && deduction > 0) {
    addDepositExpense(lease.propertyId, deduction, d.reason ?? "Deposit deduction");
  }

  const outcomeText = DEPOSIT_LABEL[status];
  const detail =
    status === "partially_refunded" ? ` ${_money(lease.depositRefundAmount ?? 0)} refunded, ${_money(deduction)} retained.`
    : status === "deducted" ? ` ${_money(deduction)} applied${d.reason ? ` to ${d.reason}` : ""}.${d.additionalOwed ? ` Additional ${_money(d.additionalOwed)} owed.` : ""}`
    : status === "refunded" ? ` ${_money(lease.deposit)} will be returned.`
    : ` ${_money(lease.deposit)} retained.`;

  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "terminated",
    summary: `Terminated lease for ${tenant?.name ?? "tenant"}; unit ${unit?.label ?? ""} released. Deposit: ${outcomeText}.${detail}`,
    after: { status: "terminated", depositStatus: status, refund: lease.depositRefundAmount, deduction, reason: d.reason },
    notify: { type: "lease", title: "Lease terminated", body: `${tenant?.name ?? "A tenant"}'s lease was terminated. Deposit: ${outcomeText}.` },
  });
  // C2/C5 — notify tenant + owner with deposit details.
  pushNotify("lease", "Your lease has been terminated", `Your lease at ${unit?.label ?? "your unit"} has been terminated. Security deposit status: ${outcomeText}.${detail}`, "lease", id, "terminated");
  pushNotify("lease", "Lease terminated", `Lease terminated at ${unit?.label ?? "a unit"}, ${propName}. Deposit: ${outcomeText}.`, "lease", id, "terminated");
  return lease;
}

/* ---------------------------------------------------- move-out settlement */

export interface MoveOutDamageLine { category: string; cost: number; notes?: string }
export interface MoveOutSettlementInput {
  moveOutDate: string;
  inspectionDate: string;
  inspector: string;
  damageLines: MoveOutDamageLine[];
  totalDamage: number;
  outstandingRent: number;
  outcome: DepositOutcome;
  settlementNote?: string;
}

export interface MoveOutResult {
  lease: Lease;
  depositStatus: string;
  refund: number;
  additionalOwed: number;
}

/** C3 — comprehensive move-out settlement run through the live engine. */
export async function settleMoveOut(id: string, input: MoveOutSettlementInput): Promise<MoveOutResult> {
  await new Promise((r) => setTimeout(r, 600));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  const unit = db.units.find((u) => u.id === lease.unitId);
  const propName = propertyName(lease.propertyId);

  const deductions = input.totalDamage + input.outstandingRent;
  const net = lease.deposit - deductions;
  const refund = Math.max(0, net);
  const additionalOwed = Math.max(0, -net);

  // Map the computed net to a deposit outcome (respecting an explicit override).
  const outcome: DepositOutcome = input.outcome;
  const depositInput: DepositOutcomeInput = {
    outcome,
    refundAmount: refund,
    deductionAmount: deductions,
    additionalOwed,
    reason: input.settlementNote || "Move-out settlement",
  };

  const settleInspector = resolveStaff(input.inspector);
  lease.inspectorId = settleInspector?.id ?? lease.inspectorId;
  lease.inspector = settleInspector?.name ?? input.inspector ?? lease.inspector;
  lease.inspectionDate = input.inspectionDate ?? lease.inspectionDate;
  lease.moveOutDate = input.moveOutDate ?? lease.moveOutDate;

  lease.status = "terminated";
  if (unit) unit.status = "vacant";
  if (tenant) tenant.status = "past";
  const status = applyDepositOutcome(lease, depositInput);

  // One expense per damaged category (linked to the property).
  for (const line of input.damageLines) {
    if (line.cost > 0) addDepositExpense(lease.propertyId, line.cost, line.category + (line.notes ? ` — ${line.notes}` : ""));
  }
  // Outstanding rent → mark this tenant's unpaid invoices as settled against the deposit.
  if (input.outstandingRent > 0) {
    for (const inv of db.invoices.filter((i) => i.tenantId === lease.tenantId && i.status !== "paid")) {
      inv.paid = inv.amount; inv.status = "paid";
    }
  }

  const outcomeText = DEPOSIT_LABEL[status];
  const refundText = refund > 0 ? ` Refund due: ${_money(refund)}.` : additionalOwed > 0 ? ` Additional owed: ${_money(additionalOwed)}.` : " No refund due.";

  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "terminated",
    summary: `Move-out processed for ${tenant?.name ?? "tenant"} from ${unit?.label ?? ""}. Deposit ${_money(lease.deposit)} − damages ${_money(input.totalDamage)} − rent ${_money(input.outstandingRent)} = ${net >= 0 ? _money(refund) + " refund" : _money(additionalOwed) + " owed"}. Outcome: ${outcomeText}.`,
    after: { moveOutDate: input.moveOutDate, depositStatus: status, refund, additionalOwed, damages: input.totalDamage, outstandingRent: input.outstandingRent },
    notify: { type: "lease", title: "Move-out processed", body: `${tenant?.name ?? "A tenant"} moved out of ${unit?.label ?? "a unit"}. Deposit: ${outcomeText}.` },
  });
  pushNotify("lease", "Your move-out has been processed", `Your move-out from ${unit?.label ?? "your unit"} has been processed. Deposit outcome: ${outcomeText}.${refundText}`, "lease", id, "terminated");
  pushNotify("lease", "Tenant moved out", `Tenant ${tenant?.name ?? "a tenant"} has moved out of ${unit?.label ?? "a unit"}, ${propName}. Unit is now vacant. Deposit: ${outcomeText}.`, "lease", id, "terminated");
  pushNotify("maintenance", "Inspection completed", `Inspection for ${unit?.label ?? "a unit"} has been completed and processed.`, "lease", id, "updated");

  return { lease, depositStatus: status, refund, additionalOwed };
}

/** C3 Step 1 — schedule the move-out + inspection and notify the parties. */
export async function initiateMoveOut(id: string, input: { moveOutDate: string; inspectionDate: string; inspector: string; notes?: string }): Promise<Lease> {
  await new Promise((r) => setTimeout(r, 400));
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  const unit = db.units.find((u) => u.id === lease.unitId);
  const propName = propertyName(lease.propertyId);
  if (input.inspector) incrementStaffJobs(input.inspector);
  // E5 — persist the inspection on the lease itself, ID-linked. It used to exist
  // only inside the audit summary, so the assignment wasn't recoverable from the record.
  const inspectorStaff = resolveStaff(input.inspector);
  lease.inspectorId = inspectorStaff?.id;
  lease.inspector = inspectorStaff?.name ?? input.inspector;
  lease.inspectionDate = input.inspectionDate;
  lease.moveOutDate = input.moveOutDate;
  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "updated",
    summary: `Move-out initiated for ${tenant?.name ?? "tenant"} (${unit?.label ?? ""}); inspection ${_dateOf(input.inspectionDate)} · inspector ${lease.inspector}`,
    after: { moveOutDate: input.moveOutDate, inspectionDate: input.inspectionDate, inspectorId: lease.inspectorId, inspector: lease.inspector },
    notify: { type: "lease", title: "Move-out initiated", body: `Move-out started for ${tenant?.name ?? "a tenant"} at ${unit?.label ?? "a unit"}. Inspection ${_dateOf(input.inspectionDate)}.` },
  });
  pushNotify("lease", "Your move-out has been initiated", `Your move-out has been initiated. An inspection is scheduled for ${_dateOf(input.inspectionDate)}.`, "lease", id, "updated");
  pushNotify("maintenance", "Exit inspection assigned", `You've been assigned an exit inspection at ${unit?.label ?? "a unit"}, ${propName} on ${_dateOf(input.inspectionDate)}.`, "lease", id, "updated");
  return lease;
}

/* ============================================================ maintenance (mutations) */

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<MaintenanceTicket> {
  await new Promise((r) => setTimeout(r, 350));
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  t.status = status;
  t.updatedAt = db.NOW_ISO;
  if (status !== "open" && !t.assignee) Object.assign(t, staffRef("James Odoi"));
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
  if (patch.assignee !== undefined) Object.assign(t, staffRef(patch.assignee));
  if (patch.cost !== undefined) t.cost = patch.cost || undefined;
  if (t.status !== "open" && !t.assignee) Object.assign(t, staffRef("James Odoi"));
  // Assigning to a new technician bumps their job counter.
  if (t.assignee && t.assignee !== before.assignee) incrementStaffJobs(t.assignee);
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
  // D3 — tenant maintenance-update notification.
  if (t.status !== before.status) pushNotify("maintenance", "Maintenance update", `Your request ${t.ref} — ${t.title} is now ${t.status.replace("_", " ")}.`, "ticket", t.id, "updated");
  return t;
}

export async function assignTicket(id: string, assignee: string): Promise<MaintenanceTicket> {
  await new Promise((r) => setTimeout(r, 350));
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  const prev = t.assignee;
  Object.assign(t, staffRef(assignee));
  if (assignee && assignee !== prev) incrementStaffJobs(assignee);
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
  // D3 — tenant rent-due notification.
  pushNotify("payment", "Rent due", `Invoice ${inv.number} for ${_money(inv.amount)} is due ${_dateOf(inv.due)}.`, "invoice", inv.id, "created");
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

export async function createAnnouncement(input: { title: string; body: string; audience: AudienceKind; audienceLabel: string; audiencePropertyId?: string; channels: BroadcastChannel[] }): Promise<Announcement> {
  await new Promise((r) => setTimeout(r, 600));
  const recipients =
    input.audience === "owners" ? db.owners.length : input.audience === "property" ? Math.round(db.tenants.length / 3) : db.tenants.length;
  const ann: Announcement = {
    id: `ann_${db.announcements.length + 1}`,
    title: input.title,
    body: input.body,
    audience: input.audience,
    // E5 — property announcements carry the id; matching on the label alone broke
    // as soon as a property was renamed.
    audiencePropertyId:
      input.audiencePropertyId ??
      (input.audience === "property"
        ? db.properties.find((p) => p.name === input.audienceLabel)?.id
        : undefined),
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

/** Owners as recipient options (id + name). */
export function ownerOptions(): { id: string; name: string }[] {
  return db.owners.map((o) => ({ id: o.id, name: o.name }));
}

export * from "./admin-mutations";
