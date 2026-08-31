/**
 * Pass-2 entity mutations (owners, tenants, leases, invoices, expenses, tickets,
 * leads, announcements, staff). Standalone so it has no cycle with admin.ts,
 * which re-exports it. Every mutation flows through `recordMutation` → live
 * revision bump + audit entry + system notification. Toasts fired by callers.
 */
import * as db from "@/lib/mock/db";
import { activeCurrency } from "@/lib/stores/preferences";
import { formatCurrencyFull } from "@/lib/format";
import { recordMutation } from "@/lib/api/actions";
import { useNotifications } from "@/lib/stores/notifications";
import { createAgreement, type AgreementInput } from "@/lib/api/agreements";
import type { Role } from "@/lib/roles";
import type { NotificationAudience, NotificationType } from "@/lib/api/notifications";

/**
 * Push an extra in-app notification for a secondary recipient (tenant / owner /
 * inspector). The mock store is single-audience, so these land in the active
 * bell with a recipient-specific title — the established pattern for multi-party
 * events. Use alongside `recordMutation` (which handles the primary/admin one).
 */
export function pushNotify(
  type: NotificationType,
  title: string,
  body: string,
  entityType: string,
  entityId: string,
  action = "updated",
  /** Restrict who may see it. Omit for the usual "everyone" behaviour. */
  audiences?: NotificationAudience[],
  /** Narrow to ONE person within that audience (worker job notifications). */
  recipientStaffId?: string,
) {
  useNotifications.getState().pushSystem({ type, title, body, entityType, entityId, action, audiences, recipientStaffId });
}

/** F5 — delegates to THE formatter. Currency defaults to the record's own. */
const money = (n: number, c: Currency = "UGX") => formatCurrencyFull(n, c);
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const propName = (propertyId: string) => db.properties.find((p) => p.id === propertyId)?.name ?? "the property";
import type {
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Lease,
  MaintenanceTicket,
  MockUser,
  Owner,
  Payment,
  PaymentMethod,
  PermissionSet,
  RoleDef,
  Staff,
  StaffAvailability,
  StaffDepartment,
  Tenant,
  TicketCategory,
  TicketPriority,
  Currency,
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
  const propName = db.properties.find((p) => p.id === lease.propertyId)?.name ?? "the property";
  recordMutation({
    entityType: "lease", entityId: lease.id, entityName: tenant?.name ?? lease.id, action: "created",
    summary: `Created lease for ${tenant?.name ?? "tenant"} on unit ${unit?.label ?? ""}`,
    after: { rent: lease.rent, start: lease.start, end: lease.end },
    notify: { type: "lease", title: "Lease created", body: `A lease was created for ${tenant?.name ?? "a tenant"} on unit ${unit?.label ?? ""}.` },
  });
  /* C6 — each party gets the message written for them, and ONLY that one. These were
     always meant to be a tenant/owner pair (see the titles); without the audience scoping
     the owner also received the tenant's "Your lease is active", addressed as if they
     were the one moving in. */
  pushNotify("lease", "Your lease is active", `Your lease for ${unit?.label ?? "your unit"} at ${propName} is now active. Monthly rent: ${money(lease.rent)}. Start date: ${dateOf(lease.start)}.`, "lease", lease.id, "created", ["tenant"]);
  pushNotify("lease", "New tenant assigned", `${tenant?.name ?? "A tenant"} has been assigned to ${unit?.label ?? "a unit"}, ${propName}. The unit is now occupied.`, "lease", lease.id, "created", ["owner"]);
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

/* -------------------------------------------------------------- payments */

export interface PayInput {
  invoiceId: string;
  method: PaymentMethod;
  amount?: number; // defaults to the full amount due
}

/** Tenant rent payment — creates a completed payment and settles the invoice. */
export async function payInvoice(input: PayInput): Promise<Payment> {
  await mDelay();
  const invoice = db.invoices.find((i) => i.id === input.invoiceId);
  if (!invoice) throw new NotFoundError(input.invoiceId);
  const due = invoice.amount - invoice.paid;
  const amount = input.amount != null ? Math.min(input.amount, due) : due;
  const payment: Payment = {
    // F5 — stamped with the currency it is being created in.
    currency: activeCurrency(),
    id: `pay_${Date.now()}`,
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    propertyId: invoice.propertyId,
    amount,
    date: new Date().toISOString(),
    method: input.method,
    reference: `NX${Math.floor(100000 + Math.random() * 900000)}`,
    status: "completed",
  };
  db.payments.unshift(payment);
  invoice.paid += amount;
  invoice.status = invoice.paid >= invoice.amount ? "paid" : "partial";
  recordMutation({
    entityType: "payment",
    entityId: payment.id,
    entityName: payment.reference,
    action: "created",
    summary: `Rent payment ${payment.reference} — ${invoice.number}`,
    after: { amount, invoice: invoice.number, method: input.method },
    notify: { type: "system", title: "Payment received", body: `${invoice.number}: ${payment.reference} recorded.` },
  });
  // D3 — tenant receipt + owner revenue, each scoped to its own audience.
  pushNotify("payment", "Payment confirmed", `Your payment of ${money(amount)} for ${invoice.number} was received. Thank you.`, "payment", payment.id, "created", ["tenant"]);
  pushNotify("payment", "Rent collected", `Rent of ${money(amount)} was collected at ${propName(invoice.propertyId)}. It will appear in your next settlement.`, "payment", payment.id, "created", ["owner"]);
  return payment;
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
    // F5 — stamped with the currency it is being created in.
    currency: activeCurrency(),
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
    notify: { type: "maintenance", title: ticket.priority === "urgent" || ticket.priority === "high" ? "Urgent ticket" : "New ticket", body: `${ticket.ref} — ${ticket.title} (${ticket.priority}).` },
  });
  /* D3 — the tenant is CONFIRMING something they reported; the owner is being INFORMED
     about their property. Unscoped, owners were reading "Your request ... was logged"
     about a ticket they did not raise. */
  pushNotify("maintenance", "Maintenance request submitted", `Your request "${ticket.title}" was logged as ${ticket.ref}. We'll keep you updated.`, "ticket", ticket.id, "created", ["tenant"]);
  pushNotify("maintenance", "Maintenance reported", `A maintenance issue was reported at ${propName(ticket.propertyId)} — ${ticket.title} (${ticket.ref}). Nexora is handling it.`, "ticket", ticket.id, "created", ["owner"]);
  return ticket;
}

export async function closeTicket(id: string, resolution: string): Promise<MaintenanceTicket> {
  await mDelay();
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new NotFoundError(id);
  const before = { status: t.status };
  t.status = "closed";
  // E2: work finished — release the job from the assignee's counter.
  decrementStaffJobs(t.assignee);
  t.resolution = resolution;
  t.updatedAt = db.NOW_ISO;
  recordMutation({
    entityType: "ticket", entityId: id, entityName: t.ref, action: "status_changed",
    summary: `Closed ticket ${t.ref}: ${resolution}`, before, after: { status: "closed", resolution },
    notify: { type: "maintenance", title: "Ticket closed", body: `${t.ref} was closed.` },
  });
  // D3 — tenant + owner maintenance-resolved, each in its own voice.
  pushNotify("maintenance", "Maintenance resolved", `Your request ${t.ref} — ${t.title} has been resolved: ${resolution}`, "ticket", t.id, "updated", ["tenant"]);
  pushNotify("maintenance", "Maintenance resolved", `${t.title} at ${propName(t.propertyId)} has been resolved (${t.ref}).`, "ticket", t.id, "updated", ["owner"]);
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
  if (patch.owner) {
    // E5 — the lead's handler is a Staff record, so store the id and derive the name.
    const handler = resolveStaff(patch.owner);
    lead.ownerStaffId = handler?.id;
    lead.owner = handler?.name ?? patch.owner;
  }
  recordMutation({
    entityType: "lead", entityId: id, entityName: lead.name, action: "updated",
    summary: `Updated lead ${lead.name} to ${lead.status}`, before, after: { status: lead.status, owner: lead.owner },
    notify: false,
  });
  return lead;
}

/* --------------------------------------------------- lead → account onboarding */

export const genTempPassword = () => `TempPass-${Math.floor(1000 + Math.random() * 9000)}`;
const LOGIN_URL = "nexora.co.ug/login";
function notifyExtra(title: string, body: string, entityType: string, entityId: string) {
  useNotifications.getState().pushSystem({ type: "system", title, body, entityType, entityId, action: "created" });
}

export interface ConvertOwnerInput {
  name: string; email: string; phone: string; company?: string; nationality?: string;
  bankName?: string; accountName?: string; accountNumber?: string;
  tempPassword: string;
  agreement?: AgreementInput | null;
}

export async function convertLeadToOwner(leadId: string, input: ConvertOwnerInput): Promise<{ ownerId: string }> {
  await mDelay();
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) throw new NotFoundError(leadId);
  const ownerId = `own_${Date.now()}`;
  const owner: Owner = {
    id: ownerId, name: input.name, email: input.email, phone: input.phone, since: db.NOW_ISO, propertyIds: [],
    company: input.company, nationality: input.nationality,
    bankName: input.bankName, accountNumber: input.accountNumber,
  };
  db.owners.push(owner);
  const user: MockUser = { id: ownerId, name: input.name, email: input.email, password: input.tempPassword, role: "owner", ownerId, title: "Property Owner", requiresPasswordChange: true };
  db.addUser(user);
  if (input.agreement) await createAgreement({ ...input.agreement, ownerId });
  lead.status = "won";
  lead.convertedTo = { type: "owner", id: ownerId, name: input.name };
  // 1) Admin activation notification (with credentials) via recordMutation.
  recordMutation({
    entityType: "lead", entityId: leadId, entityName: input.name, action: "updated",
    summary: `Lead converted to Owner — ${input.name} (${input.email})`,
    after: { ownerId, email: input.email, agreement: !!input.agreement },
    notify: { type: "system", title: "Owner Account Created — Activation Required", body: `Account created for ${input.name} (${input.email}). Temporary password: ${input.tempPassword}. Owner must change their password on first login.` },
  });
  // 2) Simulated welcome email to the owner.
  notifyExtra("Welcome to Nexora — Activate Your Account", `Hello ${input.name}, your Nexora Property Management owner account is ready. Log in at ${LOGIN_URL} with your temporary password to get started. You'll be asked to set a new password on first login.`, "owner", ownerId);
  return { ownerId };
}

export interface ConvertTenantInput {
  name: string; email: string; phone: string;
  nin?: string; employer?: string; emergencyContact?: string;
  tempPassword: string;
}

export async function convertLeadToTenant(leadId: string, input: ConvertTenantInput): Promise<{ tenantId: string }> {
  await mDelay();
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) throw new NotFoundError(leadId);
  const tenantId = `ten_${Date.now()}`;
  const tenant: Tenant = {
    id: tenantId, name: input.name, email: input.email, phone: input.phone,
    propertyId: "", unitId: "", leaseId: "", status: "active", since: db.NOW_ISO,
    nin: input.nin, employer: input.employer, emergencyContact: input.emergencyContact,
  };
  db.tenants.push(tenant);
  const user: MockUser = { id: tenantId, name: input.name, email: input.email, password: input.tempPassword, role: "tenant", tenantId, title: "Resident", requiresPasswordChange: true };
  db.addUser(user);
  lead.status = "won";
  lead.convertedTo = { type: "tenant", id: tenantId, name: input.name };
  recordMutation({
    entityType: "lead", entityId: leadId, entityName: input.name, action: "updated",
    summary: `Lead converted to Tenant — ${input.name} (${input.email})`,
    after: { tenantId, email: input.email },
    notify: { type: "system", title: "Tenant Account Created — Activation Required", body: `Account created for ${input.name} (${input.email}). Temporary password: ${input.tempPassword}. Tenant must change their password on first login. Create a lease from the Leases module.` },
  });
  notifyExtra("Welcome to Nexora — Activate Your Account", `Hello ${input.name}, your Nexora resident account is ready. Log in at ${LOGIN_URL} with your temporary password. You'll be asked to set a new password on first login.`, "tenant", tenantId);
  return { tenantId };
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
  phone?: string;
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
    phone: input.phone,
    availability: "available",
    assignedJobs: 0,
  };
  db.staff.push(member);
  recordMutation({
    entityType: "staff", entityId: member.id, entityName: member.name, action: "invited",
    summary: `Invited ${member.name} as ${member.role}`, after: { name: member.name, role: member.role },
    notify: { type: "system", title: "Staff invited", body: `${member.name} was invited to the team.` },
  });
  return member;
}

export async function updateStaff(
  id: string,
  patch: { role?: Role; status?: Staff["status"]; department?: string; phone?: string; availability?: StaffAvailability },
): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new NotFoundError(id);
  const before = { role: member.role, status: member.status };
  if (patch.role) member.role = patch.role;
  if (patch.status) member.status = patch.status;
  if (patch.department !== undefined) member.department = patch.department;
  if (patch.phone !== undefined) member.phone = patch.phone;
  if (patch.availability) member.availability = patch.availability;
  recordMutation({
    entityType: "staff", entityId: id, entityName: member.name, action: "updated",
    summary: `Updated ${member.name} (${member.role}, ${member.status})`, before, after: { role: member.role, status: member.status },
    notify: { type: "system", title: member.status === "suspended" && before.status !== "suspended" ? "Staff deactivated" : "Staff updated", body: `${member.name} account was ${member.status === "suspended" ? "deactivated" : "updated"}.` },
  });
  // D3 — notify the staff member when their account is deactivated.
  if (member.status === "suspended" && before.status !== "suspended") {
    pushNotify("system", "Account deactivated", "Your Nexora account has been deactivated. Contact an administrator for access.", "staff", id, "updated", ["worker"], id);
  }
  return member;
}

/* ------------------------------------------------- operational staff (E2) */

export interface OperationalStaffInput {
  name: string;
  phone: string;
  email?: string;
  department: StaffDepartment;
  jobTitle: string;
  availability?: StaffAvailability;
  address?: string;
  startDate?: string;
}

export const DEPARTMENT_LABEL: Record<StaffDepartment, string> = {
  maintenance: "Maintenance",
  cleaning: "Cleaning",
  laundry: "Laundry",
  car_wash: "Mobile Car Wash",
  security: "Security",
  transport: "Transport & Drivers",
  other_operations: "Other Operations",
};

/** Add a field worker — no platform role, no credentials, no dashboard access. */
export async function addOperationalStaff(input: OperationalStaffInput): Promise<Staff> {
  await mDelay();
  const member: Staff = {
    id: `stf_op_${Date.now()}`,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    status: "active",
    since: input.startDate ? new Date(input.startDate).toISOString() : db.NOW_ISO,
    department: input.department,
    jobTitle: input.jobTitle,
    availability: input.availability ?? "available",
    assignedJobs: 0,
    staffType: "operational_staff",
    address: input.address || undefined,
  };
  db.staff.push(member);
  const dept = DEPARTMENT_LABEL[input.department];
  recordMutation({
    entityType: "staff", entityId: member.id, entityName: member.name, action: "created",
    summary: `Added operational staff ${member.name} — ${input.jobTitle}, ${dept}`,
    after: { name: member.name, jobTitle: input.jobTitle, department: dept, staffType: "operational_staff" },
    notify: { type: "system", title: "New operational staff", body: `${member.name} (${input.jobTitle}, ${dept})` },
  });
  return member;
}

export async function updateOperationalStaff(id: string, patch: Partial<OperationalStaffInput> & { status?: Staff["status"] }): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new NotFoundError(id);
  const before = { jobTitle: member.jobTitle, department: member.department, phone: member.phone, availability: member.availability };
  if (patch.name) member.name = patch.name;
  if (patch.phone) member.phone = patch.phone;
  if (patch.email !== undefined) member.email = patch.email || undefined;
  if (patch.department) member.department = patch.department;
  if (patch.jobTitle) member.jobTitle = patch.jobTitle;
  if (patch.availability) member.availability = patch.availability;
  if (patch.address !== undefined) member.address = patch.address || undefined;
  if (patch.status) member.status = patch.status;
  recordMutation({
    entityType: "staff", entityId: id, entityName: member.name, action: "updated",
    summary: `Updated operational staff ${member.name} (${member.jobTitle}, ${DEPARTMENT_LABEL[(member.department ?? "other_operations") as StaffDepartment]})`,
    before, after: { jobTitle: member.jobTitle, department: member.department, phone: member.phone, availability: member.availability },
    notify: { type: "system", title: "Operational staff updated", body: `${member.name}'s details were updated.` },
  });
  return member;
}

/** Remove a field worker; any open assignments are released to Unassigned. */
export async function removeOperationalStaff(id: string): Promise<{ ok: true; unassigned: number }> {
  await mDelay();
  const idx = db.staff.findIndex((s) => s.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.staff.splice(idx, 1);
  // Release their open work so nothing is left pointing at a deleted record.
  let unassigned = 0;
  db.tickets.forEach((t) => {
    if (t.assignee === removed.name && t.status !== "completed" && t.status !== "closed") { t.assignee = undefined; unassigned++; }
  });
  db.serviceBookings.forEach((b) => {
    if (b.assignee === removed.name && b.status !== "completed" && b.status !== "cancelled") { b.assignee = undefined; unassigned++; }
  });
  recordMutation({
    entityType: "staff", entityId: id, entityName: removed.name, action: "deleted",
    summary: `Removed operational staff ${removed.name}${unassigned ? ` — ${unassigned} assignment(s) released` : ""}`,
    notify: {
      type: "system", title: "Operational staff removed",
      body: unassigned ? `${removed.name} removed — ${unassigned} assignment(s) need reassignment.` : `${removed.name} was removed from operational staff.`,
    },
  });
  return { ok: true, unassigned };
}

/** Count a staff member's currently-open assignments (used by the remove warning). */
/**
 * Resolve a Staff record from either an id or a name (E5).
 *
 * Assignments are ID-linked as of E5, but records written before it carry only a
 * name, so both are accepted. New writes always set the id — see `staffRef`.
 */
export function resolveStaff(ref?: string): Staff | undefined {
  if (!ref) return undefined;
  return db.staff.find((s) => s.id === ref) ?? db.staff.find((s) => s.name === ref);
}

/** Normalise an assignment input (id OR name) into the pair we persist. */
export function staffRef(ref?: string): { assigneeId?: string; assignee?: string } {
  const m = resolveStaff(ref);
  if (!m) return { assigneeId: undefined, assignee: ref || undefined };
  return { assigneeId: m.id, assignee: m.name };
}

/** True when a ticket/booking belongs to this staff member, by id or legacy name. */
const assignedTo = (row: { assigneeId?: string; assignee?: string }, m: Staff) =>
  row.assigneeId ? row.assigneeId === m.id : row.assignee === m.name;

export function openAssignmentsFor(name: string): number {
  const member = resolveStaff(name);
  if (!member) return 0;
  const t = db.tickets.filter((x) => assignedTo(x, member) && x.status !== "completed" && x.status !== "closed").length;
  const s = db.serviceBookings.filter((x) => assignedTo(x, member) && x.status !== "completed" && x.status !== "cancelled").length;
  return t + s;
}

/** Release one job from a staff member's counter when work finishes. */
export function decrementStaffJobs(ref?: string): void {
  const member = resolveStaff(ref);
  if (member) member.assignedJobs = Math.max(0, (member.assignedJobs ?? 0) - 1);
}

/** Cycle a staff member's availability (available → busy → off → available).
 *  Lightweight — no notification, just a live-state bump. */
export async function cycleStaffAvailability(id: string): Promise<Staff> {
  await mDelay();
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new NotFoundError(id);
  const order: StaffAvailability[] = ["available", "busy", "off"];
  const nextIdx = (order.indexOf(member.availability ?? "available") + 1) % order.length;
  member.availability = order[nextIdx];
  recordMutation({
    entityType: "staff", entityId: id, entityName: member.name, action: "updated",
    summary: `${member.name} is now ${member.availability}`, after: { availability: member.availability },
    notify: false,
  });
  // D3 — staff availability-changed notification.
  pushNotify("system", "Availability changed", `Your availability was set to ${member.availability}.`, "staff", id, "updated", ["worker"], id);
  return member;
}

/** Increment a staff member's job counter when they're assigned work in another
 *  module (maintenance / services). No-op if the name matches no active staff. */
export function incrementStaffJobs(ref: string): void {
  const member = resolveStaff(ref);
  if (member) member.assignedJobs = (member.assignedJobs ?? 0) + 1;
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

/* -------------------------------------------------------------- roles */

export interface RoleInput {
  name: string;
  description: string;
  permissions: Record<string, PermissionSet>;
}

export async function createRole(input: RoleInput): Promise<RoleDef> {
  await mDelay();
  const role: RoleDef = { id: `role_${Date.now()}`, name: input.name, description: input.description, system: false, members: 0, permissions: input.permissions };
  db.roleDefs.push(role);
  recordMutation({
    entityType: "role", entityId: role.id, entityName: role.name, action: "created",
    summary: `Created role "${role.name}"`, after: { name: role.name },
    notify: { type: "system", title: "Role created", body: `Role "${role.name}" was created.` },
  });
  return role;
}

export async function updateRole(id: string, patch: Partial<RoleInput>): Promise<RoleDef> {
  await mDelay();
  const role = db.roleDefs.find((r) => r.id === id);
  if (!role) throw new NotFoundError(id);
  const before = { name: role.name, description: role.description };
  if (patch.name) role.name = patch.name;
  if (patch.description !== undefined) role.description = patch.description;
  if (patch.permissions) role.permissions = patch.permissions;
  recordMutation({
    entityType: "role", entityId: id, entityName: role.name, action: "updated",
    summary: `Updated role "${role.name}" permissions`, before, after: { name: role.name },
    notify: { type: "system", title: "Role updated", body: `Role "${role.name}" was updated.` },
  });
  return role;
}

export async function deleteRole(id: string): Promise<{ ok: true }> {
  await mDelay();
  const idx = db.roleDefs.findIndex((r) => r.id === id);
  if (idx === -1) throw new NotFoundError(id);
  const [removed] = db.roleDefs.splice(idx, 1);
  recordMutation({
    entityType: "role", entityId: id, entityName: removed.name, action: "deleted",
    summary: `Deleted role "${removed.name}"`,
    notify: { type: "system", title: "Role deleted", body: `Role "${removed.name}" was deleted.` },
  });
  return { ok: true };
}

/* -------------------------------------------------------------- settings (audit-only) */

export async function saveSettingsSection(section: string, summary: string): Promise<{ ok: true }> {
  await mDelay();
  recordMutation({
    entityType: "settings", entityId: section, entityName: section, action: "updated",
    summary, notify: { type: "system", title: "Settings updated", body: summary },
  });
  return { ok: true };
}
