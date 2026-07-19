/**
 * Deterministic seeded mock database. Generated once at module load with a
 * fixed seed + fixed "now", so server and client render identical data (no
 * hydration drift) and values are stable across calls.
 *
 * The five seed accounts (all password "123456"):
 *   admin@nexora.co.ug    Super Admin        → /admin  (org-wide)
 *   manager@nexora.co.ug  Property Manager   → /admin  (properties/tenants)
 *   finance@nexora.co.ug  Finance Officer    → /admin  (finance-forward)
 *   salim@gmail.com       Owner              → /owner  (owns 3 properties)
 *   mubarak@gmail.com     Tenant             → /tenant (unit A-407, Nakasero)
 */

import { properties as portfolio } from "@/content/portfolio";
import type {
  Activity,
  Announcement,
  BankAccount,
  Booking,
  BookingStatus,
  Building,
  ServiceBooking,
  PermissionSet,
  RoleDef,
  TxStatus,
  TxType,
  WalletTx,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Lease,
  LeaseStatus,
  MaintenanceTicket,
  MockUser,
  Owner,
  Payment,
  PaymentMethod,
  Property,
  PropertyStatus,
  Staff,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  Tenant,
  Unit,
  UnitStatus,
  UnitType,
} from "./types";

/* ---------------------------------------------------- deterministic rng */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260710);
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

/** Fixed reference date — everything relative is derived from this. */
const NOW = new Date("2026-07-10T08:00:00.000Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (n: number) => iso(NOW.getTime() - n * DAY);

/* ------------------------------------------------------------- name pools */

const firstNames = [
  "Salim", "Mubarak", "Aisha", "David", "Grace", "Rehema", "Patrick", "Sarah",
  "Ivan", "Diana", "Joan", "Brian", "Sharon", "Kevin", "Esther", "Moses",
  "Ritah", "Andrew", "Peace", "Timothy", "Doreen", "Isaac", "Maria", "Emmanuel",
  "Betty", "Ronald", "Sylvia", "Julius", "Catherine", "Henry", "Winnie", "Samuel",
];
const lastNames = [
  "Kato", "Aliyu", "Nakato", "Okello", "Namuli", "Ssali", "Muwonge", "Nabbanja",
  "Katumba", "Achieng", "Nsubuga", "Wasswa", "Nakimuli", "Tumusiime", "Byaruhanga",
  "Mugisha", "Namara", "Kirabo", "Lubega", "Asiimwe", "Ochieng", "Nalwoga",
];
const fullName = () => `${pick(firstNames)} ${pick(lastNames)}`;
const emailOf = (name: string, dom = "example.com") =>
  `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${dom}`;
const phone = () => `+2567${int(0, 9)}${int(1000000, 9999999)}`;

/* ------------------------------------------------------------------ owners */

export const owners: Owner[] = [
  { id: "own_salim", name: "Salim Kato", email: "salim@gmail.com", phone: phone(), since: daysAgo(1120), propertyIds: [] },
  { id: "own_rehema", name: "Rehema Ssali", email: emailOf("Rehema Ssali"), phone: phone(), since: daysAgo(840), propertyIds: [] },
  { id: "own_patrick", name: "Patrick Muwonge", email: emailOf("Patrick Muwonge"), phone: phone(), since: daysAgo(690), propertyIds: [] },
  { id: "own_sarah", name: "Sarah Nabbanja", email: emailOf("Sarah Nabbanja"), phone: phone(), since: daysAgo(560), propertyIds: [] },
  { id: "own_ivan", name: "Ivan Katumba", email: emailOf("Ivan Katumba"), phone: phone(), since: daysAgo(410), propertyIds: [] },
  { id: "own_diana", name: "Diana Achieng", email: emailOf("Diana Achieng"), phone: phone(), since: daysAgo(300), propertyIds: [] },
];

/* -------------------------------------------------------------- properties */

const extraProps: Array<Omit<Property, "buildings" | "monthlyRevenue" | "since"> & { since?: string }> = [
  { id: "kira-gardens", name: "Kira Gardens", location: "Kira, Wakiso", category: "Residential", image: "/images/properties/villa-garden-pool.jpg", ownerId: "own_salim", status: "managed", units: 20, occupancy: 90 },
  { id: "muyenga-heights", name: "Muyenga Heights", location: "Muyenga, Kampala", category: "Residential", image: "/images/properties/tower-white-woodbalcony.jpg", ownerId: "own_salim", status: "managed", units: 36, occupancy: 89 },
  { id: "naguru-view", name: "Naguru View Apartments", location: "Naguru, Kampala", category: "Residential", image: "/images/properties/apartment-facade.jpg", ownerId: "own_patrick", status: "managed", units: 28, occupancy: 93 },
  { id: "nakawa-business-park", name: "Nakawa Business Park", location: "Nakawa, Kampala", category: "Commercial", image: "/images/properties/twin-towers-dusk.jpg", ownerId: "own_sarah", status: "managed", units: 22, occupancy: 86 },
  { id: "garden-city-retail", name: "Garden City Retail", location: "Central, Kampala", category: "Commercial", image: "/images/properties/aerial-neighbourhood.jpg", ownerId: "own_ivan", status: "onboarding", units: 34, occupancy: 78 },
  { id: "mbarara-plaza", name: "Mbarara Plaza", location: "Mbarara", category: "Commercial", image: "/images/properties/suburban-house.jpg", ownerId: "own_ivan", status: "managed", units: 26, occupancy: 84 },
  { id: "entebbe-logistics", name: "Entebbe Logistics Park", location: "Entebbe", category: "Managed Facilities", image: "/images/properties/residential-street.jpg", ownerId: "own_diana", status: "prospect", units: 15, occupancy: 70 },
];

// Owner assignment for the reused portfolio properties.
const portfolioOwners: Record<string, string> = {
  "nakasero-heights": "own_salim",
  "entebbe-villas": "own_salim",
  "munyonyo-suites": "own_rehema",
  "kololo-court": "own_patrick",
  "bugolobi-lofts": "own_patrick",
  "lugogo-offices": "own_sarah",
  "ntinda-plaza": "own_ivan",
  "jinja-riverside": "own_diana",
  "kampala-facilities": "own_diana",
};

function buildingsFor(id: string, name: string, units: number): Building[] {
  const count = units > 40 ? 3 : units > 20 ? 2 : 1;
  const per = Math.ceil(units / count);
  return Array.from({ length: count }, (_, i) => ({
    id: `bld_${id}_${i + 1}`,
    name: count === 1 ? "Main Block" : `Block ${String.fromCharCode(65 + i)}`,
    floors: int(3, 12),
    units: i === count - 1 ? units - per * (count - 1) : per,
  }));
}

function avgRentFor(category: Property["category"]): number {
  switch (category) {
    case "Commercial": return 4_200_000;
    case "Condominiums": return 3_400_000;
    case "Managed Facilities": return 2_600_000;
    default: return 2_400_000;
  }
}

export const properties: Property[] = [
  ...portfolio.map((p) => ({
    id: p.slug,
    name: p.name,
    location: p.location,
    category: p.category,
    image: p.image,
    ownerId: portfolioOwners[p.slug] ?? "own_diana",
    status: "managed" as PropertyStatus,
    units: p.units,
    occupancy: p.occupancy,
    buildings: buildingsFor(p.slug, p.name, p.units),
    monthlyRevenue: Math.round((p.units * (p.occupancy / 100) * avgRentFor(p.category)) / 1000) * 1000,
    since: daysAgo(int(200, 1100)),
  })),
  ...extraProps.map((p) => ({
    ...p,
    buildings: buildingsFor(p.id, p.name, p.units),
    monthlyRevenue: Math.round((p.units * (p.occupancy / 100) * avgRentFor(p.category)) / 1000) * 1000,
    since: daysAgo(int(120, 700)),
  })),
];

// backfill owner.propertyIds
for (const p of properties) {
  const o = owners.find((x) => x.id === p.ownerId);
  if (o) o.propertyIds.push(p.id);
}

/* -------------------------------------------------------------------- units */

const residentialTypes: UnitType[] = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Penthouse"];
const commercialTypes: UnitType[] = ["Office", "Retail"];
const bedroomsByType: Record<UnitType, number> = {
  Studio: 0, "1 Bedroom": 1, "2 Bedroom": 2, "3 Bedroom": 3, Penthouse: 4, Office: 0, Retail: 0,
};

export const units: Unit[] = [];

function makeUnits(p: Property) {
  const isCommercial = p.category === "Commercial" || p.category === "Managed Facilities";
  const sampleCount = Math.min(p.units, int(3, 5));
  const occupiedTarget = Math.round((p.occupancy / 100) * sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const building = pick(p.buildings);
    const floor = int(1, building.floors);
    const type = isCommercial ? pick(commercialTypes) : pick(residentialTypes);
    const status: UnitStatus =
      i < occupiedTarget ? "occupied" : chance(0.5) ? "vacant" : chance(0.5) ? "notice" : "maintenance";
    const label = `${building.name.split(" ").pop()!.charAt(0)}-${floor}${String(i + 1).padStart(2, "0")}`;
    const rentBase = avgRentFor(p.category);
    units.push({
      id: `unit_${p.id}_${i + 1}`,
      label,
      propertyId: p.id,
      buildingId: building.id,
      floor,
      type,
      bedrooms: bedroomsByType[type],
      sizeSqm: isCommercial ? int(45, 220) : int(38, 180),
      rent: Math.round((rentBase * (0.7 + rnd() * 0.9)) / 50000) * 50000,
      status,
    });
  }
}
properties.forEach(makeUnits);

/* ------------------------------------------------ rental listing config */

// Dedicated rng so rental enrichment never shifts the shared `rnd` sequence
// (units, tenants, invoices… stay byte-identical to before this feature).
const rrnd = mulberry32(775533);
const rpick = <T>(arr: T[]): T => arr[Math.floor(rrnd() * arr.length)];
const rint = (min: number, max: number) => Math.floor(rrnd() * (max - min + 1)) + min;

const AMENITY_POOL = [
  "WiFi", "Secure Parking", "24/7 Security", "Backup Generator", "Water Backup",
  "Swimming Pool", "Fully Furnished", "Air Conditioning", "Gym", "Elevator",
  "Private Balcony", "CCTV", "Landscaped Garden", "Pet Friendly", "Housekeeping",
];

// Curated short-term set (holiday / serviced lets). Salim owns entebbe-villas
// + kira-gardens + muyenga-heights, so he holds several short-term properties
// for the owner-portal rental transparency view (Revision Pass 3).
const SHORT_TERM_IDS = new Set([
  "entebbe-villas", "kira-gardens", "muyenga-heights", "munyonyo-suites",
  "nakasero-heights", "naguru-view", "bugolobi-lofts",
]);

function enrichRental(p: Property) {
  const base = avgRentFor(p.category);
  const monthly = Math.round(base / 50_000) * 50_000;
  const commercial = p.category === "Commercial" || p.category === "Managed Facilities";

  const pool = [...AMENITY_POOL];
  const amenities: string[] = [];
  const n = rint(4, 7);
  for (let i = 0; i < n && pool.length; i++) {
    amenities.push(pool.splice(Math.floor(rrnd() * pool.length), 1)[0]);
  }

  const vacant = units.filter((u) => u.propertyId === p.id && u.status === "vacant").length;

  p.amenities = amenities;
  p.bedrooms = commercial ? 0 : rpick([1, 2, 2, 3, 3, 4]);
  p.availableUnits = Math.max(1, vacant || rint(1, 4));

  // Commercial / facilities are always long-term; residential follows the set.
  if (!commercial && SHORT_TERM_IDS.has(p.id)) {
    const daily = Math.round(monthly / 24 / 1_000) * 1_000;
    p.rentalType = "short-term";
    p.rentalPayment = "online";
    p.minStay = 2;
    p.maxStay = 30;
    p.shortTerm = { daily, weekly: daily * 6, monthly, cleaningFee: 80_000 };
  } else {
    p.rentalType = "long-term";
    p.rentalPayment = "manual";
    p.minStay = 6;
    p.maxStay = 24;
    p.annualRent = monthly * 12;
  }
}
properties.forEach(enrichRental);

/* ------------------------------------------------------- tenants + leases */

export const tenants: Tenant[] = [];
export const leases: Lease[] = [];

const leaseStatusFromDates = (endMs: number): LeaseStatus => {
  const diff = endMs - NOW.getTime();
  if (diff < 0) return "expired";
  if (diff < 60 * DAY) return "expiring";
  return "active";
};

function createTenancy(unit: Unit, opts?: { id?: string; name?: string; email?: string; active?: boolean }) {
  const t = int(0, 1);
  // Occupied units mostly hold current tenancies (a minority have lapsed leases),
  // so occupancy, the tenants list and retention read realistically.
  const current = opts?.active ?? chance(0.86);
  const startMs = current ? NOW.getTime() - int(20, 320) * DAY : NOW.getTime() - int(430, 820) * DAY;
  const term = pick([365, 365, 730]);
  const endMs = startMs + term * DAY;
  const tenantId = opts?.id ?? `ten_${tenants.length + 1}`;
  const leaseId = `lse_${leases.length + 1}`;
  const name = opts?.name ?? fullName();
  const status = leaseStatusFromDates(endMs);

  leases.push({
    id: leaseId,
    tenantId,
    unitId: unit.id,
    propertyId: unit.propertyId,
    start: iso(startMs),
    end: iso(endMs),
    rent: unit.rent,
    deposit: unit.rent * 2,
    status,
    frequency: t === 0 ? "monthly" : pick(["monthly", "quarterly", "annually"] as const),
  });
  tenants.push({
    id: tenantId,
    name,
    email: opts?.email ?? emailOf(name),
    phone: phone(),
    propertyId: unit.propertyId,
    unitId: unit.id,
    leaseId,
    status: status === "expired" ? "past" : status === "expiring" && chance(0.4) ? "notice" : "active",
    since: iso(startMs),
  });
  unit.tenantId = tenantId;
  unit.leaseId = leaseId;
}

// Wire Mubarak into a specific Nakasero unit (owned by Salim) so the tenant
// portal (Batch 11) has a concrete, reviewable tenancy.
const nakUnits = units.filter((u) => u.propertyId === "nakasero-heights");
const mubarakUnit =
  nakUnits.find((u) => u.status !== "occupied") ?? nakUnits[0];
mubarakUnit.label = "A-407";
mubarakUnit.status = "occupied";
mubarakUnit.type = "2 Bedroom";
mubarakUnit.bedrooms = 2;
mubarakUnit.rent = 2_800_000;
createTenancy(mubarakUnit, {
  id: "ten_mubarak",
  name: "Mubarak Aliyu",
  email: "mubarak@gmail.com",
  active: true,
});

// Everyone else in occupied units.
for (const u of units) {
  if (u.status === "occupied" && !u.tenantId) createTenancy(u);
}

export const MUBARAK_LEASE_ID = tenants.find((t) => t.id === "ten_mubarak")!.leaseId;

/* ---------------------------------------------------- invoices + payments */

export const invoices: Invoice[] = [];
export const payments: Payment[] = [];
const methods: PaymentMethod[] = ["bank", "mobile_money", "cash", "card"];

let invSeq = 1;
let paySeq = 1;
// Last 4 monthly cycles per active/expiring lease.
for (const lease of leases) {
  if (lease.status === "expired" || lease.status === "terminated") continue;
  for (let m = 3; m >= 0; m--) {
    const issued = new Date("2026-07-01T00:00:00Z");
    issued.setUTCMonth(issued.getUTCMonth() - m);
    const due = new Date(issued);
    due.setUTCDate(5);
    const overdueLikely = m === 0 ? 0.35 : m === 1 ? 0.12 : 0.03;
    let status: InvoiceStatus;
    if (chance(overdueLikely)) status = due.getTime() < NOW.getTime() ? "overdue" : "pending";
    else if (m === 0 && chance(0.3)) status = chance(0.5) ? "pending" : "partial";
    else status = "paid";

    const amount = lease.rent;
    const paid = status === "paid" ? amount : status === "partial" ? Math.round(amount * 0.5) : 0;
    const invoice: Invoice = {
      id: `inv_${invSeq}`,
      number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
      leaseId: lease.id,
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      kind: "rent",
      issued: iso(issued.getTime()),
      due: iso(due.getTime()),
      amount,
      paid,
      status,
    };
    invoices.push(invoice);
    invSeq++;

    if (paid > 0) {
      payments.push({
        id: `pay_${paySeq}`,
        invoiceId: invoice.id,
        tenantId: lease.tenantId,
        propertyId: lease.propertyId,
        amount: paid,
        date: iso(due.getTime() + int(-2, 6) * DAY),
        method: pick(methods),
        reference: `NX${int(100000, 999999)}`,
        status: "completed",
      });
      paySeq++;
    }
  }
}

/* ------------------------------------------------------------- expenses */

const expenseCats: ExpenseCategory[] = ["maintenance", "utilities", "security", "cleaning", "admin", "insurance"];
const vendors = ["Umeme Ltd", "NWSC", "SecureGuard Ltd", "SparkleClean", "BuildFix Co", "Jubilee Insurance", "TechServ", "GreenScape"];
export const expenses: Expense[] = Array.from({ length: 32 }, (_, i) => {
  const p = pick(properties);
  const category = pick(expenseCats);
  return {
    id: `exp_${i + 1}`,
    propertyId: p.id,
    category,
    vendor: pick(vendors),
    description: `${category[0].toUpperCase() + category.slice(1)} — ${p.name}`,
    amount: int(3, 90) * 50_000,
    date: daysAgo(int(1, 120)),
    status: pick(["approved", "approved", "pending", "reimbursed"] as Expense["status"][]),
  };
});

/* ------------------------------------------------------- maintenance */

const ticketTitles: Record<TicketCategory, string[]> = {
  plumbing: ["Leaking kitchen tap", "Blocked bathroom drain", "Low water pressure", "Burst pipe in riser"],
  electrical: ["Faulty socket in bedroom", "Corridor lights out", "Tripping breaker", "Generator fault"],
  hvac: ["AC not cooling", "Noisy ventilation fan", "Thermostat unresponsive"],
  appliance: ["Water heater not working", "Cooker hood faulty", "Fridge repair request"],
  structural: ["Cracked wall plaster", "Loose balcony railing", "Door frame damage"],
  cleaning: ["Deep clean after move-out", "Common area cleaning", "Waste chute odour"],
  security: ["Access card not working", "CCTV camera offline", "Gate motor fault"],
  other: ["Repaint request", "Pest control", "Key replacement"],
};
const ticketCats = Object.keys(ticketTitles) as TicketCategory[];
const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"];
const ticketStatuses: TicketStatus[] = ["open", "assigned", "in_progress", "completed", "closed"];
const technicians = ["James Odoi", "Fred Wanyama", "Peter Ssemakula", "Alex Mugume", "Unassigned"];

export const tickets: MaintenanceTicket[] = Array.from({ length: 26 }, (_, i) => {
  const occupied = units.filter((u) => u.tenantId);
  const unit = pick(occupied.length ? occupied : units);
  const category = pick(ticketCats);
  const status = pick(ticketStatuses);
  const createdMs = NOW.getTime() - int(0, 60) * DAY;
  const assigned = status !== "open";
  return {
    id: `tkt_${i + 1}`,
    ref: `TKT-${String(i + 1).padStart(4, "0")}`,
    title: pick(ticketTitles[category]),
    description: "Reported via the resident portal. Awaiting review and scheduling.",
    propertyId: unit.propertyId,
    unitId: unit.id,
    tenantId: unit.tenantId,
    category,
    priority: pick(priorities),
    status,
    assignee: assigned ? pick(technicians.filter((t) => t !== "Unassigned")) : undefined,
    cost: status === "completed" || status === "closed" ? int(1, 30) * 50_000 : undefined,
    createdAt: iso(createdMs),
    updatedAt: iso(createdMs + int(0, 10) * DAY),
  };
});

/* -------------------------------------------------------------- CRM leads */

const leadSources = ["Website — Quote", "Website — Assessment", "Referral", "WhatsApp", "Walk-in", "Investor page"];
const leadServices = ["Property Management", "Rental Management", "Facility Management", "Condominium Management", "Investment advisory"];
const leadStatuses: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const staffNames = ["Aisha Nakato", "David Okello", "Grace Namuli"];

export const leads: Lead[] = Array.from({ length: 18 }, (_, i) => {
  const name = fullName();
  const status = pick(leadStatuses);
  const createdMs = NOW.getTime() - int(0, 80) * DAY;
  const activities = Array.from({ length: int(1, 4) }, (_, a) => ({
    id: `act_${i}_${a}`,
    at: iso(createdMs + a * int(1, 6) * DAY),
    kind: pick(["note", "call", "email", "meeting", "status"] as const),
    text: pick([
      "Left a voicemail, will follow up.",
      "Sent introductory email and brochure.",
      "Discussed portfolio and fee structure.",
      "Scheduled a site assessment.",
      "Shared a draft proposal.",
    ]),
  }));
  return {
    id: `lead_${i + 1}`,
    name,
    email: emailOf(name),
    phone: phone(),
    source: pick(leadSources),
    service: pick(leadServices),
    status,
    value: int(2, 30) * 500_000,
    createdAt: iso(createdMs),
    owner: pick(staffNames),
    activities,
  };
});

/* ------------------------------------------------------------------ staff */

export const staff: Staff[] = [
  { id: "stf_admin", name: "Aisha Nakato", email: "admin@nexora.co.ug", role: "super_admin", status: "active", since: daysAgo(900) },
  { id: "stf_manager", name: "David Okello", email: "manager@nexora.co.ug", role: "property_manager", status: "active", since: daysAgo(600) },
  { id: "stf_finance", name: "Grace Namuli", email: "finance@nexora.co.ug", role: "finance_officer", status: "active", since: daysAgo(540) },
  { id: "stf_ops", name: "Moses Nsubuga", email: emailOf("Moses Nsubuga", "nexora.co.ug"), role: "ops_manager", status: "active", since: daysAgo(480) },
  { id: "stf_maint", name: "James Odoi", email: emailOf("James Odoi", "nexora.co.ug"), role: "maintenance_officer", status: "active", since: daysAgo(360) },
  { id: "stf_pm2", name: "Sharon Kirabo", email: emailOf("Sharon Kirabo", "nexora.co.ug"), role: "property_manager", status: "invited", since: daysAgo(20) },
];

/* -------------------------------------------------------------- users */

export const users: MockUser[] = [
  { id: "own_salim", name: "Salim Kato", email: "salim@gmail.com", password: "123456", role: "owner", ownerId: "own_salim", title: "Property Owner" },
  { id: "ten_mubarak", name: "Mubarak Aliyu", email: "mubarak@gmail.com", password: "123456", role: "tenant", tenantId: "ten_mubarak", title: "Resident" },
  { id: "stf_admin", name: "Aisha Nakato", email: "admin@nexora.co.ug", password: "123456", role: "super_admin", staffId: "stf_admin", title: "Super Administrator" },
  { id: "stf_manager", name: "David Okello", email: "manager@nexora.co.ug", password: "123456", role: "property_manager", staffId: "stf_manager", title: "Property Manager" },
  { id: "stf_finance", name: "Grace Namuli", email: "finance@nexora.co.ug", password: "123456", role: "finance_officer", staffId: "stf_finance", title: "Finance Officer" },
];

/* ------------------------------------------------------- announcements */

export const announcements: Announcement[] = [
  {
    id: "ann_1",
    title: "Scheduled water maintenance — Nakasero Heights",
    body: "Water supply will be interrupted on Saturday 09:00–13:00 for tank cleaning. We apologise for the inconvenience.",
    audience: "property",
    audienceLabel: "Nakasero Heights",
    channels: ["email", "in_app"],
    recipients: 47,
    sentAt: daysAgo(3),
    sentBy: "David Okello",
  },
  {
    id: "ann_2",
    title: "New online rent payment options",
    body: "You can now pay rent via mobile money and card directly from your tenant portal. Faster receipts, instant confirmation.",
    audience: "all_tenants",
    audienceLabel: "All tenants",
    channels: ["email", "sms", "in_app"],
    recipients: 30,
    sentAt: daysAgo(11),
    sentBy: "Aisha Nakato",
  },
  {
    id: "ann_3",
    title: "Q2 owner statements now available",
    body: "Your Q2 financial statements and disbursement summaries are ready to download from the Owner portal.",
    audience: "owners",
    audienceLabel: "All owners",
    channels: ["email"],
    recipients: 6,
    sentAt: daysAgo(19),
    sentBy: "Grace Namuli",
  },
  {
    id: "ann_4",
    title: "Festive season security advisory",
    body: "Please keep entrances locked and report suspicious activity to the front desk over the holiday period.",
    audience: "all_tenants",
    audienceLabel: "All tenants",
    channels: ["in_app"],
    recipients: 30,
    sentAt: daysAgo(34),
    sentBy: "Moses Nsubuga",
  },
];

/* --------------------------------------------------------- activity feed */

export const activities: Activity[] = [
  ...payments.slice(0, 6).map((p, i) => {
    const t = tenants.find((x) => x.id === p.tenantId);
    return { id: `af_pay_${i}`, at: p.date, kind: "payment" as const, text: `${t?.name ?? "Tenant"} paid ${(p.amount / 1_000_000).toFixed(1)}M rent` };
  }),
  ...tickets.filter((t) => t.status === "open").slice(0, 4).map((t, i) => ({
    id: `af_tkt_${i}`, at: t.createdAt, kind: "ticket" as const, text: `New ${t.priority} ticket: ${t.title}`,
  })),
  ...leads.filter((l) => l.status === "new").slice(0, 3).map((l, i) => ({
    id: `af_lead_${i}`, at: l.createdAt, kind: "lead" as const, text: `New lead — ${l.name} (${l.service})`,
  })),
  ...leases.filter((l) => l.status === "expiring").slice(0, 3).map((l, i) => {
    const t = tenants.find((x) => x.id === l.tenantId);
    return { id: `af_lease_${i}`, at: daysAgo(int(1, 8)), kind: "lease" as const, text: `Lease expiring soon — ${t?.name ?? "tenant"}` };
  }),
].sort((a, b) => (a.at < b.at ? 1 : -1));

/* --------------------------------------------------------- bookings */

const rFullName = () => `${rpick(firstNames)} ${rpick(lastNames)}`;
const rEmail = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
const rPhone = () => `+2567${rint(0, 9)}${rint(1000000, 9999999)}`;

const bookingStatuses: BookingStatus[] = ["confirmed", "confirmed", "completed", "pending"];
const bookingPayMethods = ["flutterwave", "mobile_money", "card"];
const shortTermProps = properties.filter((p) => p.rentalType === "short-term");

/** Seeded short-term bookings — several land on Salim's properties so the
 *  owner-portal rental view and admin Bookings module (Pass 3) have data. */
export const bookings: Booking[] = Array.from({ length: 14 }, (_, i) => {
  const p = rpick(shortTermProps);
  const st = p.shortTerm!;
  const nights = rint(2, 12);
  const checkInMs = NOW.getTime() + rint(-45, 55) * DAY;
  const checkOutMs = checkInMs + nights * DAY;
  const propUnits = units.filter((u) => u.propertyId === p.id);
  const unit = propUnits.length ? rpick(propUnits) : undefined;
  const subtotal = st.daily * nights + st.cleaningFee;
  const taxes = Math.round((subtotal * 0.18) / 1000) * 1000;
  const name = rFullName();
  const status = checkOutMs < NOW.getTime() ? "completed" : rpick(bookingStatuses);
  return {
    id: `bkg_${i + 1}`,
    reference: `NX-BK-${rint(100000, 999999)}`,
    propertyId: p.id,
    propertyName: p.name,
    unitId: unit?.id,
    unitLabel: unit?.label,
    guestName: name,
    guestEmail: rEmail(name),
    guestPhone: rPhone(),
    adults: rint(1, 4),
    children: rint(0, 3),
    checkIn: iso(checkInMs),
    checkOut: iso(checkOutMs),
    nights,
    nightlyRate: st.daily,
    cleaningFee: st.cleaningFee,
    taxes,
    total: subtotal + taxes,
    paymentMethod: rpick(bookingPayMethods),
    status,
    createdAt: iso(checkInMs - rint(3, 30) * DAY),
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

const cleaningCats = ["Residential Cleaning", "Commercial Cleaning", "Deep Cleaning", "Move-In/Move-Out", "Event Cleaning", "Facility Cleaning", "Scheduled Programme"];
const lifestyleCats = ["Laundry", "Mobile Car Wash", "Gardening & Lawn", "Janitorial"];
const timeSlots = ["08:00–10:00", "10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00"];

export const serviceBookings: ServiceBooking[] = Array.from({ length: 10 }, (_, i) => {
  const kind: ServiceBooking["kind"] = i % 2 === 0 ? "cleaning" : "lifestyle";
  const category = kind === "cleaning" ? rpick(cleaningCats) : rpick(lifestyleCats);
  const name = rFullName();
  const createdMs = NOW.getTime() - rint(1, 40) * DAY;
  const status = rpick(["confirmed", "completed", "pending", "confirmed"] as BookingStatus[]);
  return {
    id: `svb_${i + 1}`,
    reference: `NX-SV-${rint(100000, 999999)}`,
    kind,
    category,
    name,
    email: rEmail(name),
    phone: rPhone(),
    location: rpick(["Kololo, Kampala", "Naguru, Kampala", "Muyenga, Kampala", "Ntinda, Kampala", "Entebbe"]),
    propertyType: kind === "cleaning" ? rpick(["Apartment", "House", "Office", "Retail"]) : undefined,
    date: iso(NOW.getTime() + rint(1, 20) * DAY),
    time: rpick(timeSlots),
    status,
    createdAt: iso(createdMs),
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/* ------------------------------------------------------------ helpers */

/* --------------------------------------------------------- RBAC roles */

export const PERMISSION_MODULES = [
  "properties", "units", "tenants", "owners", "leases", "finance", "maintenance", "crm", "analytics", "settings", "staff",
] as const;

const rw = (read: boolean, write: boolean): PermissionSet => ({ read, write });
function perms(spec: Partial<Record<(typeof PERMISSION_MODULES)[number], [boolean, boolean]>>, fallback: [boolean, boolean] = [false, false]): Record<string, PermissionSet> {
  const out: Record<string, PermissionSet> = {};
  for (const m of PERMISSION_MODULES) {
    const p = spec[m] ?? fallback;
    out[m] = rw(p[0], p[1]);
  }
  return out;
}

export const roleDefs: RoleDef[] = [
  { id: "role_super_admin", name: "Super Admin", description: "Full access to every module and setting.", system: true, members: 1, permissions: perms({}, [true, true]) },
  { id: "role_ops_manager", name: "Operations Manager", description: "Operations oversight across properties and teams.", system: true, members: 1, permissions: perms({ settings: [true, false], analytics: [true, false] }, [true, true]) },
  { id: "role_property_manager", name: "Property Manager", description: "Manages properties, units, tenants, leases and maintenance.", system: true, members: 2, permissions: perms({ properties: [true, true], units: [true, true], tenants: [true, true], owners: [true, false], leases: [true, true], maintenance: [true, true], crm: [true, true], finance: [true, false], analytics: [true, false] }) },
  { id: "role_maintenance_officer", name: "Maintenance Officer", description: "Handles maintenance tickets and technicians.", system: true, members: 1, permissions: perms({ maintenance: [true, true], properties: [true, false], units: [true, false] }) },
  { id: "role_finance_officer", name: "Finance Officer", description: "Invoices, payments, expenses and financial reports.", system: true, members: 1, permissions: perms({ finance: [true, true], owners: [true, false], analytics: [true, false] }) },
  { id: "role_owner", name: "Owner", description: "Portal access to their own properties and financials.", system: true, members: 6, permissions: perms({ properties: [true, false], finance: [true, false], analytics: [true, false] }) },
  { id: "role_tenant", name: "Tenant", description: "Portal access to their lease, payments and requests.", system: true, members: 30, permissions: perms({ leases: [true, false], finance: [true, false], maintenance: [true, true] }) },
];

/* -------------------------------------------------------------- wallet */

export const wallet = { balance: 148_500_000 };

const txTypes: TxType[] = ["deposit", "withdrawal", "fee", "disbursement", "refund"];
const txDesc: Record<TxType, string[]> = {
  deposit: ["Rent collected — Nakasero Heights", "Rent collected — Kololo Court", "Mobile-money settlement", "Card settlement batch"],
  withdrawal: ["Withdrawal to Stanbic ••3421", "Operating float top-up", "Withdrawal to Absa ••7788"],
  fee: ["Management fee", "Payment gateway fee", "Bank charges"],
  disbursement: ["Owner disbursement — Salim Kato", "Owner disbursement — Rehema Ssali", "Owner disbursement — Diana Achieng"],
  refund: ["Deposit refund — vacated unit", "Overpayment refund"],
};
export const walletTransactions: WalletTx[] = Array.from({ length: 22 }, (_, i) => {
  const type = i < 3 ? "deposit" : pick(txTypes);
  return {
    id: `wtx_${i + 1}`,
    date: daysAgo(int(0, 90)),
    type,
    amount: int(2, 90) * 500_000,
    status: (chance(0.86) ? "completed" : chance(0.5) ? "pending" : "failed") as TxStatus,
    reference: `WX${int(100000, 999999)}`,
    description: pick(txDesc[type]),
  };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

export const bankAccounts: BankAccount[] = [
  { id: "bank_1", bankName: "Stanbic Bank Uganda", accountNumber: "9030012343421", accountName: "Nexora Property Management Ltd", branch: "Garden City", swift: "SBICUGKX", primary: true },
  { id: "bank_2", bankName: "Absa Bank Uganda", accountNumber: "6002458897788", accountName: "Nexora Property Management Ltd", branch: "Kampala Road", swift: "BARCUGKX", primary: false },
];

export const NOW_ISO = NOW.toISOString();

/**
 * Append a lead captured by a marketing-site form (quote / assessment / investor
 * / contact) into the shared registry, so public submissions surface live in the
 * admin CRM. Runtime-only (user action), so no hydration concern.
 */
export function addMarketingLead(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source: string;
  service: string;
}): Lead {
  const lead: Lead = {
    id: `lead_web_${Date.now()}`,
    name: input.name,
    email: input.email,
    phone: input.phone || "—",
    source: input.source,
    service: input.service,
    status: "new",
    value: int(2, 20) * 500_000,
    createdAt: new Date().toISOString(),
    owner: "Unassigned",
    activities: input.message
      ? [{ id: `act_web_${Date.now()}`, at: new Date().toISOString(), kind: "note", text: input.message }]
      : [],
  };
  leads.unshift(lead);
  return lead;
}

export function findUser(email: string, password: string): MockUser | undefined {
  const e = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === e && u.password === password);
}
