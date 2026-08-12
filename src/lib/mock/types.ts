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
  /** Forces a password change on first login (onboarded accounts). */
  requiresPasswordChange?: boolean;
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

/* ------------------------------------------------ management agreements */

export type ContractType = "fixed_fee" | "revenue_sharing" | "hybrid";
export type SettlementSchedule = "monthly" | "quarterly" | "on_demand";
export type AgreementStatus = "active" | "expired" | "draft" | "terminated";

/**
 * The single source of truth for how Nexora earns from managing an owner's
 * properties. Every commission/settlement calculation derives from this — no
 * hardcoded percentages anywhere.
 */
export interface ManagementAgreement {
  id: string;
  ownerId: string;
  ownerName: string; // denormalized for display
  contractType: ContractType;
  // fixed_fee
  fixedAmount?: number;
  fixedFrequency?: "monthly" | "quarterly" | "annual";
  // revenue_sharing
  commissionPercentage?: number;
  // hybrid
  hybridFixedAmount?: number;
  hybridPercentage?: number;
  // common
  effectiveDate: string; // ISO
  expiryDate: string; // ISO
  settlementSchedule: SettlementSchedule;
  payoutBankName?: string;
  payoutAccountNumber?: string; // stored full; masked in display
  payoutAccountName?: string;
  status: AgreementStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------------------------------- properties */

export type PropertyStatus = "managed" | "onboarding" | "prospect";

/** Rental listing configuration. Short-term = instant online booking;
 *  long-term = inquiry-only (manual payment, no instant booking). */
export type RentalType = "short-term" | "long-term";
export type RentalPaymentMode = "online" | "manual";

export interface ShortTermPricing {
  daily: number; // UGX / night
  weekly: number; // UGX / week
  monthly: number; // UGX / month
  cleaningFee: number; // UGX per booking
}

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
  /* ---- rental listing config (Revision Pass 2) ----
     Optional on the base entity (so existing construction stays intact);
     populated for every property at seed time. Use `RentalListing` when you
     need them guaranteed present. */
  rentalType?: RentalType;
  rentalPayment?: RentalPaymentMode;
  /** Short-term: nights. Long-term: months. */
  minStay?: number;
  maxStay?: number;
  /** Present for short-term rentals. */
  shortTerm?: ShortTermPricing;
  /** Present for long-term rentals (UGX / year). */
  annualRent?: number;
  amenities?: string[];
  /** Typical bedroom count, used for browse filtering. */
  bedrooms?: number;
  /** Units currently available to rent/book. */
  availableUnits?: number;
  /* ---- richer configuration (7-step creation) ---- */
  description?: string;
  bathrooms?: number;
  videos?: string[];
  floorPlans?: string[];
  documents?: string[];
}

/** A property guaranteed to carry rental-listing config (post-seed). */
export interface RentalListing extends Property {
  rentalType: RentalType;
  rentalPayment: RentalPaymentMode;
  amenities: string[];
  bedrooms: number;
  availableUnits: number;
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
  /** Set when the lead is converted — links to the created owner/tenant record. */
  convertedTo?: { type: "owner" | "tenant"; id: string; name: string };
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

/* ----------------------------------------------------- bookings */

export type BookingStatus =
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "pending"
  | "completed";

/** Service-booking lifecycle (distinct from stay bookings). */
export type ServiceBookingStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Short-term rental booking (instant, online-paid). */
export interface Booking {
  id: string;
  reference: string; // NX-BK-XXXXXX
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitLabel?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  specialRequests?: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  nights: number;
  nightlyRate: number;
  cleaningFee: number;
  taxes: number;
  total: number;
  paymentMethod: string; // flutterwave | mobile_money | card
  status: BookingStatus;
  createdAt: string; // ISO
}

export type ServiceBookingKind = "cleaning" | "lifestyle";

/** Cleaning / Home & Lifestyle service booking. */
export interface ServiceBooking {
  id: string;
  reference: string; // NX-SV-XXXXXX
  kind: ServiceBookingKind;
  category: string; // e.g. "Residential Cleaning" | "Laundry"
  name: string;
  email: string;
  phone: string;
  location: string;
  propertyType?: string;
  size?: string;
  details?: string; // items/weight, vehicle type, area size…
  date: string; // ISO preferred date
  time: string; // preferred time slot
  status: ServiceBookingStatus;
  assignee?: string; // assigned staff/technician
  createdAt: string; // ISO
}

/* -------------------------------------------------- activity feed */

export interface Activity {
  id: string;
  at: string; // ISO
  kind: "payment" | "lease" | "ticket" | "lead" | "property" | "tenant";
  text: string;
}
