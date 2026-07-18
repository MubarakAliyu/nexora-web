/**
 * Nexora domain entities (per the PRD). This mock layer mirrors the shape the
 * Django REST backend will return, so the UI depends only on the typed async
 * accessors in `lib/api/admin.ts` — swapping to real endpoints later is local.
 *
 * Hierarchy: Owner → Property → Building → Floor → Unit → Lease → Tenant,
 * with Invoices/Payments/Expenses, Maintenance tickets, CRM leads and staff.
 */

import type { Role } from "@/lib/roles";
import type { Category } from "@/content/portfolio";

export type { Category };

/* --------------------------------------------------------------- users */

export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  /** Links the account to its domain record for identity-scoped portals. */
  ownerId?: string;
  tenantId?: string;
  staffId?: string;
  title?: string;
}

/* ------------------------------------------------------------- owners */

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  since: string; // ISO date
  propertyIds: string[];
  company?: string;
  nationality?: string;
  bankName?: string;
  accountNumber?: string;
}

export interface CommLog {
  id: string;
  at: string; // ISO
  channel: "email" | "call" | "meeting" | "sms" | "note";
  summary: string;
}

/* --------------------------------------------------------- properties */

export type PropertyStatus = "managed" | "onboarding" | "prospect";

export interface Building {
  id: string;
  name: string;
  floors: number;
  units: number;
}

export interface Property {
  id: string; // == portfolio slug where reused
  name: string;
  location: string;
  category: Category;
  image: string;
  ownerId: string;
  status: PropertyStatus;
  units: number;
  occupancy: number; // %
  monthlyRevenue: number; // UGX
  buildings: Building[];
  since: string;
}

/* -------------------------------------------------------------- units */

export type UnitStatus = "occupied" | "vacant" | "notice" | "maintenance";
export type UnitType =
  | "Studio"
  | "1 Bedroom"
  | "2 Bedroom"
  | "3 Bedroom"
  | "Penthouse"
  | "Office"
  | "Retail";

export interface Unit {
  id: string;
  label: string; // e.g. "A-402"
  propertyId: string;
  buildingId: string;
  floor: number;
  type: UnitType;
  bedrooms: number;
  sizeSqm: number;
  rent: number; // monthly UGX
  status: UnitStatus;
  tenantId?: string;
  leaseId?: string;
  amenities?: string[];
}

/* ------------------------------------------------------------ tenants */

export type TenantStatus = "active" | "notice" | "past";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  propertyId: string;
  unitId: string;
  leaseId: string;
  status: TenantStatus;
  since: string;
  nin?: string;
  employer?: string;
  emergencyContact?: string;
}

/* ------------------------------------------------------------- leases */

export type LeaseStatus = "active" | "expiring" | "expired" | "terminated" | "pending";

export interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  start: string; // ISO
  end: string; // ISO
  rent: number; // monthly UGX
  deposit: number;
  status: LeaseStatus;
  frequency: "monthly" | "quarterly" | "annually";
  dueDay?: number;
  gracePeriod?: number;
}

/* ------------------------------------------------------ finance */

export type InvoiceStatus = "paid" | "pending" | "overdue" | "partial";
export type InvoiceKind = "rent" | "service" | "deposit" | "utility";

export interface Invoice {
  id: string;
  number: string; // INV-2026-0001
  leaseId: string;
  tenantId: string;
  propertyId: string;
  kind: InvoiceKind;
  issued: string; // ISO
  due: string; // ISO
  amount: number;
  paid: number;
  status: InvoiceStatus;
}

export type PaymentMethod = "bank" | "mobile_money" | "cash" | "card";
export type PaymentStatus = "completed" | "pending" | "failed";

export interface Payment {
  id: string;
  invoiceId: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  date: string; // ISO
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
}

export type ExpenseCategory =
  | "maintenance"
  | "utilities"
  | "security"
  | "cleaning"
  | "admin"
  | "insurance";

export interface Expense {
  id: string;
  propertyId: string;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  amount: number;
  date: string; // ISO
  status: "approved" | "pending" | "reimbursed";
}

/* ------------------------------------------------------- maintenance */

export type TicketStatus = "open" | "assigned" | "in_progress" | "completed" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "structural"
  | "cleaning"
  | "security"
  | "other";

export interface MaintenanceTicket {
  id: string;
  ref: string; // TKT-0001
  title: string;
  description: string;
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  cost?: number;
  resolution?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/* --------------------------------------------------------------- CRM */

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export interface LeadActivity {
  id: string;
  at: string; // ISO
  kind: "note" | "call" | "email" | "meeting" | "status";
  text: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  service: string;
  status: LeadStatus;
  value: number; // estimated monthly UGX
  createdAt: string; // ISO
  owner: string; // assigned staff name
  activities: LeadActivity[];
}

/* ------------------------------------------------------------- staff */

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  since: string;
  department?: string;
}

/* ------------------------------------------------------ announcements */

export type AudienceKind = "all_tenants" | "property" | "owners" | "custom";
export type BroadcastChannel = "email" | "sms" | "in_app";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AudienceKind;
  audienceLabel: string;
  channels: BroadcastChannel[];
  recipients: number;
  sentAt: string; // ISO
  sentBy: string;
}

/* ---------------------------------------------------- RBAC role defs */

export interface PermissionSet {
  read: boolean;
  write: boolean;
}

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  system: boolean;
  members: number;
  permissions: Record<string, PermissionSet>;
}

/* ------------------------------------------------------------- wallet */

export type TxType = "deposit" | "withdrawal" | "fee" | "disbursement" | "refund";
export type TxStatus = "completed" | "pending" | "failed";

export interface WalletTx {
  id: string;
  date: string; // ISO
  type: TxType;
  amount: number; // UGX (always positive; direction implied by type)
  status: TxStatus;
  reference: string;
  description: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string; // stored full; UI masks to last 4
  accountName: string;
  branch: string;
  swift: string;
  primary: boolean;
}

/* -------------------------------------------------- activity feed */

export interface Activity {
  id: string;
  at: string; // ISO
  kind: "payment" | "lease" | "ticket" | "lead" | "property" | "tenant";
  text: string;
}
