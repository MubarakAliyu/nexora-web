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
import type {
  Activity,
  Expense,
  Invoice,
  Lead,
  Lease,
  MaintenanceTicket,
  Owner,
  Payment,
  Property,
  Staff,
  Tenant,
  Unit,
} from "@/lib/mock/types";

export type { Activity, Expense, Invoice, Lead, Lease, MaintenanceTicket, Owner, Payment, Property, Staff, Tenant, Unit };
export type { Building, LeaseStatus, InvoiceStatus, TicketStatus, TicketPriority, UnitStatus, PropertyStatus } from "@/lib/mock/types";

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
  return respond({ tenant, lease, unit, property, invoices, payments, tickets }, { error: scope?.forceError });
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
export function ownerName(id?: string): string {
  return db.owners.find((o) => o.id === id)?.name ?? "—";
}
export function tenantName(id?: string): string {
  return db.tenants.find((t) => t.id === id)?.name ?? "—";
}
export function unitLabel(id?: string): string {
  return db.units.find((u) => u.id === id)?.label ?? "—";
}
