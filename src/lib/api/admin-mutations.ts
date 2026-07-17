/**
 * Pass-2 entity mutations (owners, tenants, leases, invoices, expenses, tickets,
 * leads, announcements, staff). Standalone so it has no cycle with admin.ts,
 * which re-exports it. Every mutation flows through `recordMutation` → live
 * revision bump + audit entry + system notification. Toasts fired by callers.
 */
import * as db from "@/lib/mock/db";
import { recordMutation } from "@/lib/api/actions";
import type { Role } from "@/lib/roles";
import type {
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Lease,
  MaintenanceTicket,
  Owner,
  Staff,
  Tenant,
  TicketCategory,
  TicketPriority,
} from "@/lib/mock/types";

class NotFoundError extends Error {}
const mDelay = () => new Promise((r) => setTimeout(r, 450));
const pName = (id: string) => db.properties.find((p) => p.id === id)?.name ?? "—";

/* -------------------------------------------------------------- owners */

export interface OwnerInput {
  name: string;
  email: string;
  phone: string;
  company?: string;
  nationality?: string;
  bankName?: string;
  accountNumber?: string;
}

export async function createOwner(input: OwnerInput): Promise<Owner> {
  await mDelay();
  const owner: Owner = {
    id: `own_${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    since: db.NOW_ISO,
    propertyIds: [],
    company: input.company,
    nationality: input.nationality,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
  };
  db.owners.push(owner);
  recordMutation({
    entityType: "owner", entityId: owner.id, entityName: owner.name, action: "created",
    summary: `Added owner ${owner.name}`, after: { name: owner.name, email: owner.email },
    notify: { type: "system", title: "Owner added", body: `${owner.name} was added as a property owner.` },
  });
  return owner;
}

export async function updateOwner(id: string, patch: Partial<OwnerInput>): Promise<Owner> {
  await mDelay();
  const owner = db.owners.find((o) => o.id === id);
  if (!owner) throw new NotFoundError(id);
  const before = { name: owner.name, email: owner.email, phone: owner.phone };
  Object.assign(owner, {
    name: patch.name ?? owner.name,
    email: patch.email ?? owner.email,
    phone: patch.phone ?? owner.phone,
    company: patch.company ?? owner.company,
    nationality: patch.nationality ?? owner.nationality,
    bankName: patch.bankName ?? owner.bankName,
    accountNumber: patch.accountNumber ?? owner.accountNumber,
  });
  recordMutation({
    entityType: "owner", entityId: id, entityName: owner.name, action: "updated",
    summary: `Updated owner ${owner.name}`, before, after: { name: owner.name, email: owner.email, phone: owner.phone },
    notify: { type: "system", title: "Owner updated", body: `${owner.name} details were updated.` },
  });
  return owner;
}

/* -------------------------------------------------------------- tenants */

export interface TenantInput {
  name: string;
  email: string;
  phone: string;
  nin?: string;
  employer?: string;
  emergencyContact?: string;
}

export async function createTenant(input: TenantInput): Promise<Tenant> {
  await mDelay();
  const tenant: Tenant = {
    id: `ten_${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    propertyId: "",
    unitId: "",
    leaseId: "",
    status: "active",
    since: db.NOW_ISO,
    nin: input.nin,
    employer: input.employer,
    emergencyContact: input.emergencyContact,
  };
  db.tenants.push(tenant);
  recordMutation({
    entityType: "tenant", entityId: tenant.id, entityName: tenant.name, action: "created",
    summary: `Added tenant ${tenant.name}`, after: { name: tenant.name, email: tenant.email },
    notify: { type: "system", title: "Tenant added", body: `${tenant.name} was added as a tenant.` },
  });
  return tenant;
}

export async function updateTenant(id: string, patch: Partial<TenantInput>): Promise<Tenant> {
  await mDelay();
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new NotFoundError(id);
  const before = { name: tenant.name, email: tenant.email, phone: tenant.phone };
  Object.assign(tenant, {
    name: patch.name ?? tenant.name,
    email: patch.email ?? tenant.email,
    phone: patch.phone ?? tenant.phone,
    nin: patch.nin ?? tenant.nin,
    employer: patch.employer ?? tenant.employer,
    emergencyContact: patch.emergencyContact ?? tenant.emergencyContact,
  });
  recordMutation({
    entityType: "tenant", entityId: id, entityName: tenant.name, action: "updated",
    summary: `Updated tenant ${tenant.name}`, before, after: { name: tenant.name, email: tenant.email, phone: tenant.phone },
    notify: { type: "system", title: "Tenant updated", body: `${tenant.name} details were updated.` },
  });
  return tenant;
}

/* -------------------------------------------------------------- leases */

export interface LeaseInput {
  tenantId: string;
  unitId: string;
  start: string;
  end: string;
  frequency: Lease["frequency"];
  rent: number;
  deposit: number;
  dueDay?: number;
  gracePeriod?: number;
}

export async function createLease(input: LeaseInput): Promise<Lease> {
  await mDelay();
  const unit = db.units.find((u) => u.id === input.unitId);
  const tenant = db.tenants.find((t) => t.id === input.tenantId);
  const lease: Lease = {
    id: `lse_${Date.now()}`,
    tenantId: input.tenantId,
    unitId: input.unitId,
    propertyId: unit?.propertyId ?? "",
    start: input.start,
    end: input.end,
    rent: input.rent,
    deposit: input.deposit,
    status: "active",
    frequency: input.frequency,
    dueDay: input.dueDay,
    gracePeriod: input.gracePeriod,
  };
  db.leases.unshift(lease);
  if (unit) { unit.status = "occupied"; unit.tenantId = input.tenantId; unit.leaseId = lease.id; }
  if (tenant) { tenant.status = "active"; tenant.unitId = input.unitId; tenant.leaseId = lease.id; tenant.propertyId = unit?.propertyId ?? tenant.propertyId; }
  recordMutation({
    entityType: "lease", entityId: lease.id, entityName: tenant?.name ?? lease.id, action: "created",
    summary: `Created lease for ${tenant?.name ?? "tenant"} on unit ${unit?.label ?? ""}`,
    after: { rent: lease.rent, start: lease.start, end: lease.end },
    notify: { type: "lease", title: "Lease created", body: `A lease was created for ${tenant?.name ?? "a tenant"} on unit ${unit?.label ?? ""}.` },
  });
  return lease;
}

export async function updateLease(id: string, patch: Partial<LeaseInput>): Promise<Lease> {
  await mDelay();
  const lease = db.leases.find((l) => l.id === id);
  if (!lease) throw new NotFoundError(id);
  const before = { rent: lease.rent, start: lease.start, end: lease.end };
  Object.assign(lease, {
    start: patch.start ?? lease.start,
    end: patch.end ?? lease.end,
    frequency: patch.frequency ?? lease.frequency,
    rent: patch.rent ?? lease.rent,
    deposit: patch.deposit ?? lease.deposit,
    dueDay: patch.dueDay ?? lease.dueDay,
    gracePeriod: patch.gracePeriod ?? lease.gracePeriod,
  });
  const tenant = db.tenants.find((t) => t.id === lease.tenantId);
  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "updated",
    summary: `Updated lease for ${tenant?.name ?? "tenant"}`, before, after: { rent: lease.rent, start: lease.start, end: lease.end },
    notify: { type: "lease", title: "Lease updated", body: `${tenant?.name ?? "A tenant"} lease terms were updated.` },
  });
  return lease;
}

export async function deleteLease(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.leases.findIndex((l) => l.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.leases.splice(idx, 1);
  const unit = db.units.find((u) => u.id === removed.unitId);
  if (unit && unit.leaseId === id) { unit.status = "vacant"; unit.tenantId = undefined; unit.leaseId = undefined; }
  const tenant = db.tenants.find((t) => t.id === removed.tenantId);
  recordMutation({
    entityType: "lease", entityId: id, entityName: tenant?.name ?? id, action: "deleted",
    summary: `Deleted lease for ${tenant?.name ?? "tenant"}`,
    notify: { type: "lease", title: "Lease deleted", body: `A lease record was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- invoices */

export async function updateInvoice(id: string, patch: { status?: InvoiceStatus; paid?: number }): Promise<Invoice> {
  await mDelay();
  const inv = db.invoices.find((i) => i.id === id);
  if (!inv) throw new NotFoundError(id);
  const before = { status: inv.status, paid: inv.paid };
  if (patch.status) {
    inv.status = patch.status;
    if (patch.status === "paid") inv.paid = inv.amount;
    else if (patch.status === "pending" || patch.status === "overdue") inv.paid = 0;
  }
  if (patch.paid !== undefined) inv.paid = patch.paid;
  recordMutation({
    entityType: "invoice", entityId: id, entityName: inv.number, action: "status_changed",
    summary: `Invoice ${inv.number} to ${inv.status}`, before, after: { status: inv.status, paid: inv.paid },
    notify: { type: "payment", title: "Invoice updated", body: `${inv.number} was marked ${inv.status}.` },
  });
  return inv;
}

export async function deleteInvoice(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.invoices.findIndex((i) => i.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.invoices.splice(idx, 1);
  recordMutation({
    entityType: "invoice", entityId: id, entityName: removed.number, action: "deleted",
    summary: `Deleted invoice ${removed.number}`,
    notify: { type: "payment", title: "Invoice deleted", body: `${removed.number} was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- expenses */

export type ExpensePatch = Partial<{ propertyId: string; category: ExpenseCategory; vendor: string; amount: number; description: string }>;

export async function updateExpense(id: string, patch: ExpensePatch): Promise<Expense> {
  await mDelay();
  const exp = db.expenses.find((e) => e.id === id);
  if (!exp) throw new NotFoundError(id);
  const before = { category: exp.category, amount: exp.amount, vendor: exp.vendor };
  Object.assign(exp, {
    propertyId: patch.propertyId ?? exp.propertyId,
    category: patch.category ?? exp.category,
    vendor: patch.vendor ?? exp.vendor,
    amount: patch.amount ?? exp.amount,
    description: patch.description ?? exp.description,
  });
  recordMutation({
    entityType: "expense", entityId: id, entityName: exp.vendor, action: "updated",
    summary: `Updated expense (${exp.vendor})`, before, after: { category: exp.category, amount: exp.amount, vendor: exp.vendor },
    notify: { type: "system", title: "Expense updated", body: `An expense for ${pName(exp.propertyId)} was updated.` },
  });
  return exp;
}

export async function deleteExpense(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.expenses.splice(idx, 1);
  recordMutation({
    entityType: "expense", entityId: id, entityName: removed.vendor, action: "deleted",
    summary: `Deleted expense (${removed.vendor})`,
    notify: { type: "system", title: "Expense deleted", body: `An expense was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- tickets */

export interface TicketInput {
  unitId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export async function createTicket(input: TicketInput): Promise<MaintenanceTicket> {
  await mDelay();
  const unit = db.units.find((u) => u.id === input.unitId);
  const ticket: MaintenanceTicket = {
    id: `tkt_${Date.now()}`,
    ref: `TKT-${String(db.tickets.length + 1).padStart(4, "0")}`,
    title: input.title,
    description: input.description,
    propertyId: unit?.propertyId ?? "",
    unitId: input.unitId,
    tenantId: unit?.tenantId,
    category: input.category,
    priority: input.priority,
    status: "open",
    createdAt: db.NOW_ISO,
    updatedAt: db.NOW_ISO,
  };
  db.tickets.unshift(ticket);
  recordMutation({
    entityType: "ticket", entityId: ticket.id, entityName: ticket.ref, action: "created",
    summary: `Created ticket ${ticket.ref} — ${ticket.title}`, after: { title: ticket.title, priority: ticket.priority },
    notify: { type: "maintenance", title: "New ticket", body: `${ticket.ref} — ${ticket.title} (${ticket.priority}).` },
  });
  return ticket;
}

export async function closeTicket(id: string, resolution: string): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  const before = { status: t.status };
  t.status = "closed";
  t.resolution = resolution;
  t.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `Closed ticket ${t.ref}: ${resolution}`, before, after: { status: "closed", resolution },
    notify: { type: "maintenance", title: "Ticket closed", body: `${t.ref} was closed.` },
  });
  return t;
}

export async function deleteTicket(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.tickets.findIndex((t) => t.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.tickets.splice(idx, 1);
  recordMutation({
    entityType: "ticket", entityId: id, entityName: removed.ref, action: "deleted",
    summary: `Deleted ticket ${removed.ref}`,
    notify: { type: "maintenance", title: "Ticket deleted", body: `${removed.ref} was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- leads */

export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  source: string;
  service?: string;
  notes?: string;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  await mDelay();
  const lead: Lead = {
    id: `lead_${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source,
    service: input.service ?? "Property Management",
    status: "new",
    value: 5_000_000,
    createdAt: db.NOW_ISO,
    owner: "Unassigned",
    activities: input.notes ? [{ id: `act_${Date.now()}`, at: db.NOW_ISO, kind: "note", text: input.notes }] : [],
  };
  db.leads.unshift(lead);
  recordMutation({
    entityType: "lead", entityId: lead.id, entityName: lead.name, action: "created",
    summary: `Added lead ${lead.name} (${lead.source})`, after: { name: lead.name, source: lead.source },
    notify: { type: "system", title: "Lead added", body: `${lead.name} was added to the pipeline.` },
  });
  return lead;
}

export async function updateLead(id: string, patch: { status?: LeadStatus; owner?: string }): Promise<Lead> {
  await mDelay();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) throw new NotFoundError(id);
  const before = { status: lead.status, owner: lead.owner };
  if (patch.status) lead.status = patch.status;
  if (patch.owner) lead.owner = patch.owner;
  recordMutation({
    entityType: "lead", entityId: id, entityName: lead.name, action: "updated",
    summary: `Updated lead ${lead.name} to ${lead.status}`, before, after: { status: lead.status, owner: lead.owner },
    notify: false,
  });
  return lead;
}

export async function convertLead(id: string, target: "owner" | "tenant"): Promise<{ ok: true; created: string }> {
  await mDelay();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) throw new NotFoundError(id);
  let createdId = "";
  if (target === "owner") {
    const owner: Owner = { id: `own_${Date.now()}`, name: lead.name, email: lead.email, phone: lead.phone, since: db.NOW_ISO, propertyIds: [] };
    db.owners.push(owner);
    createdId = owner.id;
  } else {
    const tenant: Tenant = { id: `ten_${Date.now()}`, name: lead.name, email: lead.email, phone: lead.phone, propertyId: "", unitId: "", leaseId: "", status: "active", since: db.NOW_ISO };
    db.tenants.push(tenant);
    createdId = tenant.id;
  }
  lead.status = "won";
  recordMutation({
    entityType: "lead", entityId: id, entityName: lead.name, action: "updated",
    summary: `Converted lead ${lead.name} to ${target}`, after: { target, createdId },
    notify: { type: "system", title: "Lead converted", body: `${lead.name} was converted to a ${target}.` },
  });
  return { ok: true, created: createdId };
}

export async function deleteLead(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.leads.findIndex((l) => l.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.leads.splice(idx, 1);
  recordMutation({
    entityType: "lead", entityId: id, entityName: removed.name, action: "deleted",
    summary: `Deleted lead ${removed.name}`,
    notify: { type: "system", title: "Lead deleted", body: `${removed.name} was removed from the pipeline.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- announcements */

export async function deleteAnnouncement(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.announcements.findIndex((a) => a.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.announcements.splice(idx, 1);
  recordMutation({
    entityType: "announcement", entityId: id, entityName: removed.title, action: "deleted",
    summary: `Deleted announcement "${removed.title}"`,
    notify: { type: "announcement", title: "Announcement deleted", body: `"${removed.title}" was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- staff */

export interface StaffInput {
  name: string;
  email: string;
  role: Role;
  department?: string;
}

export async function inviteStaff(input: StaffInput): Promise<Staff> {
  await mDelay();
  const member: Staff = {
    id: `stf_${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "invited",
    since: db.NOW_ISO,
    department: input.department,
  };
  db.staff.push(member);
  recordMutation({
    entityType: "staff", entityId: member.id, entityName: member.name, action: "invited",
    summary: `Invited ${member.name} as ${member.role}`, after: { name: member.name, role: member.role },
    notify: { type: "system", title: "Staff invited", body: `${member.name} was invited to the team.` },
  });
  return member;
}

export async function updateStaff(id: string, patch: { role?: Role; status?: Staff["status"] }): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new NotFoundError(id);
  const before = { role: member.role, status: member.status };
  if (patch.role) member.role = patch.role;
  if (patch.status) member.status = patch.status;
  recordMutation({
    entityType: "staff", entityId: id, entityName: member.name, action: "updated",
    summary: `Updated ${member.name} (${member.role}, ${member.status})`, before, after: { role: member.role, status: member.status },
    notify: { type: "system", title: "Staff updated", body: `${member.name} account was updated.` },
  });
  return member;
}

export async function removeStaff(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.staff.findIndex((s) => s.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.staff.splice(idx, 1);
  recordMutation({
    entityType: "staff", entityId: id, entityName: removed.name, action: "deleted",
    summary: `Removed staff member ${removed.name}`,
    notify: { type: "system", title: "Staff removed", body: `${removed.name} was removed from the team.` },
  });
  return { ok: true };
}
