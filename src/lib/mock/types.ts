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

/* ---------------------------------------------- owner settlements (Rev D) */

/** A processed owner payout for a period — the record created by the
 *  settlement workflow. Money movement is external; this is the ledger entry. */
export interface SettlementRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  period: string; // e.g. "June 2026"
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  grossRevenue: number;
  serviceRevenue: number;
  managementFee: number;
  expenses: number;
  depositDeductions: number;
  netPayout: number;
  bankMasked: string;
  status: "completed" | "pending";
  processedAt: string; // ISO
  processedBy: string;
  note?: string;
  agreementId?: string;
  agreementType?: ContractType;
  agreementRate?: string;
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

export type LeaseStatus =
  | "active"
  | "expiring"
  | "expiring_soon"
  | "expired"
  | "terminated"
  | "pending"
  | "renewal_requested"
  | "pending_renewal";

/** Security-deposit lifecycle. `held` is the default while a lease is live. */
export type DepositStatus =
  | "held"
  | "refunded"
  | "partially_refunded"
  | "deducted"
  | "forfeited";

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
  /* ---- deposit settlement (Revision C) ---- */
  depositStatus?: DepositStatus;
  depositRefundAmount?: number;
  depositDeductionAmount?: number;
  depositReason?: string;
  depositSettledAt?: string; // ISO
  depositAdditionalOwed?: number;
  /* ---- move-out inspection (Revision C · ID-linked in E5) ---- */
  inspectorId?: string;
  inspector?: string;
  inspectionDate?: string; // ISO
  moveOutDate?: string; // ISO
  /* ---- renewal request (Revision C) ---- */
  renewalRequestedAt?: string; // ISO
  renewalRequestedEnd?: string; // ISO — tenant's preferred new end date
  renewalNotes?: string;
}

/* ------------------------------------------------------ finance */

export type InvoiceStatus = "paid" | "pending" | "overdue" | "partial";
export type InvoiceKind = "rent" | "service" | "maintenance" | "deposit" | "utility";

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
  /** E4: set when this invoice was raised from a maintenance ticket. */
  maintenanceTicketId?: string;
  /** E3: set when this invoice was raised from a service booking. */
  serviceBookingId?: string;
  /** Display name when there is no tenant record (walk-in service client). */
  clientName?: string;
  dueDate?: string;
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
  /** E4: set when this expense was raised by closing a maintenance ticket. */
  maintenanceTicketId?: string;
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
  /** Authoritative link to the Staff record. `assignee` is the denormalised
   *  display name, kept for legacy records written before E5. */
  assigneeId?: string;
  assignee?: string;
  cost?: number;
  resolution?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO

  /* ---- E4: cost liability. Recording a cost is not enough — the system must
     know WHO PAYS it, or the number goes nowhere. ---- */
  liability?: TicketLiability;
  liabilityReason?: string;
  /** Labour / materials split behind `cost` (cost stays the total). */
  labourCost?: number;
  materialsCost?: number;

  /* Invoice — only when liability is 'tenant'. */
  invoiceId?: string;
  invoiceNumber?: string; // derived from the ticket ref: TKT-0019 → INV-TKT-0019
  invoiceAmount?: number;
  invoiceDueDate?: string;
  invoiceGeneratedAt?: string;

  paymentStatus?: TicketPaymentStatus;
  paidAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;

  /** Expense raised when liability is 'owner' (property) or 'nexora' (operational). */
  expenseId?: string;
  closedAt?: string;
}

/** Who bears a maintenance cost. */
export type TicketLiability = "owner" | "tenant" | "nexora";

/** Only tenant-liable tickets are ever invoiced, so the others are N/A. */
export type TicketPaymentStatus = "not_applicable" | "awaiting_payment" | "paid";

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
  /** Human-facing reference, e.g. NX-LD-4F21C8 (matches the booking convention). */
  reference?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  service: string;
  status: LeadStatus;
  value: number; // estimated monthly UGX
  createdAt: string; // ISO
  /** Authoritative link to the Staff record handling this lead. */
  ownerStaffId?: string;
  /** Set on rental inquiries — the property enquired about. Previously this was
   *  only recoverable by regex-parsing the activity note. */
  propertyId?: string;
  owner: string; // assigned staff name (display)
  activities: LeadActivity[];
  /** Set when the lead is converted — links to the created owner/tenant record. */
  convertedTo?: { type: "owner" | "tenant"; id: string; name: string };
}

/* ------------------------------------------------------------- staff */

/** `off` is the legacy spelling of `on_leave`; both render as "On leave". */
export type StaffAvailability = "available" | "busy" | "off" | "on_leave";

/**
 * Two kinds of staff share this record (E2):
 *  - `system_user` — platform operators with a role and login credentials.
 *  - `operational_staff` — field workers (cleaners, technicians, drivers…) who
 *    receive job assignments but have NO role and NO dashboard access.
 */
export type StaffType = "system_user" | "operational_staff";

export type StaffDepartment =
  | "maintenance"
  | "cleaning"
  | "laundry"
  | "car_wash"
  | "security"
  | "transport"
  | "other_operations";

export interface Staff {
  id: string;
  name: string;
  /** Optional for operational staff — many field workers have no email. */
  email?: string;
  /** Present only for system users; operational staff have no platform role. */
  role?: Role;
  status: "active" | "invited" | "suspended";
  since: string; // join date (ISO)
  department?: string;
  phone?: string;
  availability?: StaffAvailability;
  /** Running count of jobs assigned across maintenance + services. */
  assignedJobs?: number;
  /* ---- E2: operational staff ---- */
  /** Defaults to "system_user" when absent (every pre-E2 record). */
  staffType?: StaffType;
  jobTitle?: string;
  address?: string;
}

/* ------------------------------------------------------ announcements */

export type AudienceKind = "all_tenants" | "property" | "owners" | "custom";
export type BroadcastChannel = "email" | "sms" | "in_app";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AudienceKind;
  /** Set when `audience` is "property" — matching by name is fragile. */
  audiencePropertyId?: string;
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
/**
 * Service-booking lifecycle (E3). Pricing is ASSESSMENT-BASED: a staff member
 * visits, scopes the job and quotes it — there is deliberately no rate card,
 * because a truck wash and a sedan wash are not the same job.
 *
 *   new → assigned → assessment_completed → invoice_generated →
 *   awaiting_payment → paid → in_progress → completed → confirmed
 *                                        ↘ cancelled (from most states)
 *
 * `new` is the legacy spelling of `pending`; `assessment_required` marks a booking
 * explicitly sent back for assessment. Both older statuses are preserved.
 */
export type ServiceBookingStatus =
  | "new"
  | "pending"
  /* ---- F1: quote-before-work path for standardised, catalogue-priced services ---- */
  | "quote_accepted"
  | "requires_quotation"
  | "assigned"
  | "assessment_required"
  | "assessment_completed"
  | "invoice_generated"
  | "awaiting_payment"
  | "paid"
  | "in_progress"
  | "completed"
  | "confirmed"
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
  /* ---- transaction detail (E1 · R3) ---- */
  /** Links the guest to a tenant/customer record where one exists. */
  customerId?: string;
  paymentStatus?: PaymentBookingStatus;
  /** Gateway/transaction reference for the payment. */
  paymentReference?: string;
  paidAt?: string; // ISO
}

/** Payment state on a booking (distinct from the booking's own lifecycle status). */
export type PaymentBookingStatus = "paid" | "pending" | "refunded" | "failed";

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
  /** Authoritative link to the Staff record; `assignee` is the display name. */
  assigneeId?: string;
  assignee?: string; // assigned staff/technician
  createdAt: string; // ISO
  /* ---- transaction detail (E1 · R3). Pricing is assessment-based (see E3), so
     amount stays undefined until an assessment has been recorded. ---- */
  customerId?: string;
  /** F1 — the accepted quotation and its snapshotted total. */
  quotationId?: string;
  quoteTotal?: number;
  /** F1 — set when the booking contains items flagged for separate quotation. */
  hasSeparatelyQuotedItems?: boolean;
  serviceTypeId?: string;
  amount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string; // ISO

  /* ---- E3: assessment → invoice → payment → work → confirmation ---- */
  /** Cleaning / laundry / car wash always need an on-site scope before pricing. */
  assessmentRequired?: boolean;
  assessedBy?: string; // staff name (resolves to a Staff record)
  assessedAt?: string;
  assessmentScope?: string;
  assessmentNotes?: string;
  assessedAmount?: number;
  assessmentPhotos?: string[];

  invoiceId?: string;
  invoiceNumber?: string; // derived from the booking ref: NX-SV-186900 → INV-SV-186900
  invoiceAmount?: number; // may differ from assessedAmount if adjusted
  invoiceAdjustmentReason?: string;
  invoiceDueDate?: string;
  invoiceGeneratedAt?: string;

  paymentStatus?: ServicePaymentStatus;
  paidAmount?: number;

  workStartedAt?: string;
  completedById?: string;
  completedBy?: string;
  completionNotes?: string;
  completionPhotos?: string[];
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
}

/** Payment state on a service booking, across its assessment-first lifecycle. */
export type ServicePaymentStatus =
  | "not_invoiced"
  | "awaiting_payment"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "pending";

/* -------------------------------------------------- activity feed */

export interface Activity {
  id: string;
  at: string; // ISO
  kind: "payment" | "lease" | "ticket" | "lead" | "property" | "tenant";
  text: string;
}

/* ==================================================================
 * SERVICE CATALOGUE (F1) — three levels, ALL admin-managed.
 *
 * Nothing about the catalogue lives in code. The admin creates service
 * types, categories within them, and priced items within those. The public
 * booking forms build themselves from whatever is configured, so when the
 * stakeholder finally supplies a price list nobody has to touch a file.
 *
 * `selectionMode` on the CATEGORY is what drives the booking-form UI — that
 * single field is how one generic renderer serves every service type, present
 * and future, without a switch on service name.
 * ================================================================== */

/** How the customer chooses from a category. Drives the booking-form widget. */
export type SelectionMode = "quantity" | "single_choice" | "multi_choice";

export type CatalogueCurrency = "UGX" | "USD";

/** LEVEL 1 — a top-level bookable service. */
export interface ServiceType {
  id: string;
  name: string;
  /** Auto-generated from name; used in URLs. */
  slug: string;
  description: string | null;
  /** Flowbite icon key, chosen by the admin from a visual picker. */
  icon: string;
  /** Which public booking form serves it, when it maps to one. */
  bookingRoute?: string | null;
  active: boolean;
  sortOrder: number;
  /** False while placeholder pricing is in use — drives the admin banner. */
  pricesConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** LEVEL 2 — a grouping within a service type. */
export interface ServiceCategory {
  id: string;
  serviceTypeId: string;
  name: string;
  description: string | null;
  selectionMode: SelectionMode;
  /** Must the customer choose from this category before continuing? */
  required: boolean;
  active: boolean;
  sortOrder: number;
}

/** LEVEL 3 — the priced thing. */
export interface CatalogueItem {
  id: string;
  serviceTypeId: string;
  categoryId: string;
  name: string;
  description: string | null;
  /** FREE TEXT label the admin types ("per room", "per kg"). Never an enum —
   *  if they invent "per square metre" tomorrow it must work with no code change. */
  unit: string;
  price: number;
  currency: CatalogueCurrency;
  minQuantity: number | null;
  maxQuantity: number | null;
  /** "Other" behaviour: reveals a required description field when selected. */
  requiresDescription: boolean;
  /** Shown to the customer but NOT counted — quoted separately after review. */
  excludeFromTotal: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A line on an accepted quotation — prices are SNAPSHOT, never re-read. */
export interface QuotationLine {
  itemId: string;
  categoryId: string;
  name: string;
  unit: string;
  quantity: number;
  /** The price AS IT WAS when the customer accepted. Never recomputed. */
  unitPriceAtBooking: number;
  lineTotal: number;
  /** Free-text detail captured for requiresDescription items. */
  description?: string;
  /** Mirrors CatalogueItem.excludeFromTotal at acceptance time. */
  excludedFromTotal: boolean;
}

export type QuotationStatus = "accepted" | "superseded" | "cancelled";

/**
 * A customer-accepted quotation.
 *
 * PRICE SNAPSHOTTING IS THE POINT. If the admin reprices an item tomorrow, an
 * already-accepted quotation must not silently rewrite itself — that would be an
 * accounting problem, not a display quirk. Every line stores the price it was
 * accepted at, and nothing here is ever recalculated from the live catalogue.
 */
export interface Quotation {
  id: string;
  bookingId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  lines: QuotationLine[];
  subtotal: number;
  total: number;
  currency: CatalogueCurrency;
  acceptedAt: string;
  status: QuotationStatus;
}
