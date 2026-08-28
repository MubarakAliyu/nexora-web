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
  Booking,
  BookingStatus,
  Building,
  ServiceBooking,
  SettlementRecord,
  ServiceBookingStatus,
  PermissionSet,
  RoleDef,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Lease,
  LeaseStatus,
  ManagementAgreement,
  MaintenanceTicket,
  MockUser,
  Owner,
  Payment,
  PaymentMethod,
  Property,
  PropertyStatus,
  Staff,
  StaffAvailability,
  StaffDepartment,
  TicketLiability,
  ServiceType,
  ServiceCategory,
  CatalogueItem,
  Quotation,
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
// + kira-gardens (short-term) and nakasero-heights + muyenga-heights
// (long-term, incl. Mubarak's lease), so his owner portal shows BOTH rental
// types for the Pass 3 transparency view.
const SHORT_TERM_IDS = new Set([
  "entebbe-villas", "kira-gardens", "munyonyo-suites",
  "naguru-view", "bugolobi-lofts",
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
  const term = pick([365, 365, 730]);
  // E1/R4: cap how far a CURRENT tenancy has run so it keeps at least ~4 months
  // left. Previously elapsed could reach 320 days against a 365-day term, which
  // made most of the portfolio read as near-expiry. Deliberate near-expiry demos
  // are set explicitly further below instead.
  const elapsed = current ? int(20, Math.max(40, term - 120)) : int(430, 820);
  const startMs = NOW.getTime() - elapsed * DAY;
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

// --- E1/R4: keep exactly two leases inside the 30-day expiry window so the
// "Expiring Soon" badge and the urgency pulse still demo — but put them on
// ORDINARY tenants. Revision C forced them onto Mubarak (the tenant demo login),
// which is why the PM opened the tenant portal to an alarming "expires in 21 days"
// on what should be a normal 12-month tenancy.
export const NEAR_EXPIRY_DEMO: { leaseId: string; tenant: string; days: number }[] = [];
{
  // Mubarak (demo tenant) → a realistic ~8 months remaining.
  const mub = leases.find((l) => l.id === MUBARAK_LEASE_ID);
  if (mub) {
    mub.end = iso(NOW.getTime() + 243 * DAY);
    mub.start = iso(NOW.getTime() - 122 * DAY); // 12-month term, 4 months elapsed
    mub.status = "active";
  }
  // Two non-demo tenants carry the near-expiry demos: 11 days (urgent pulse) and
  // 25 days (Expiring Soon badge).
  const others = leases.filter((l) => l.status === "active" && l.id !== MUBARAK_LEASE_ID);
  [11, 25].forEach((days, i) => {
    const lease = others[i];
    if (!lease) return;
    lease.end = iso(NOW.getTime() + days * DAY);
    NEAR_EXPIRY_DEMO.push({
      leaseId: lease.id,
      tenant: tenants.find((t) => t.id === lease.tenantId)?.name ?? lease.tenantId,
      days,
    });
  });
}

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

// Guarantee Mubarak (the demo tenant) always carries one outstanding invoice,
// so the tenant Pay-Rent flow and the dashboard "next payment due" banner are
// always demonstrable regardless of the random draw above.
{
  const mubInvoices = invoices
    .filter((i) => i.leaseId === MUBARAK_LEASE_ID)
    .sort((a, b) => (a.due < b.due ? 1 : -1));
  const target = mubInvoices[0];
  if (target) {
    target.paid = 0;
    target.status = new Date(target.due).getTime() < NOW.getTime() ? "overdue" : "pending";
    for (let i = payments.length - 1; i >= 0; i--) {
      if (payments[i].invoiceId === target.id) payments.splice(i, 1);
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

/* ------------------------------------------------ E4: ticket cost liability
   Recording a cost is not enough — the system must know who pays it. Give the
   already-closed tickets a realistic spread across owner / tenant / Nexora so
   every branch is demonstrable without manual setup. */
{
  const closed = tickets.filter((t) => (t.status === "completed" || t.status === "closed") && t.cost);
  const LIABILITY_REASONS: Record<TicketLiability, string[]> = {
    owner: [
      "Normal wear and tear on original fittings.",
      "Structural issue pre-dating the tenancy.",
      "Ageing installation reached end of service life.",
    ],
    tenant: [
      "Damage caused by tenant misuse.",
      "Breakage reported by the tenant during their occupancy.",
      "Tenant overloaded the circuit, causing the fault.",
    ],
    nexora: [
      "Goodwill fix absorbed by Nexora.",
      "Covered under the management agreement.",
    ],
  };
  closed.forEach((t, i) => {
    // Roughly half owner, a third tenant, the rest absorbed by Nexora.
    const liability: TicketLiability = i % 6 === 2 || i % 6 === 5 ? "tenant" : i % 6 === 4 ? "nexora" : "owner";
    const total = t.cost ?? 0;
    const labour = Math.round(total * 0.6);
    t.liability = liability;
    t.liabilityReason = pick(LIABILITY_REASONS[liability]);
    t.labourCost = labour;
    t.materialsCost = total - labour;
    t.closedAt = t.updatedAt;

    if (liability === "tenant") {
      // Every third tenant-liable ticket has already settled.
      const settled = i % 3 === 0;
      t.invoiceNumber = `INV-${t.ref}`;
      t.invoiceAmount = total;
      // Clamp to NOW — a handful of tickets carry an updatedAt slightly ahead of
      // it, and an invoice dated in the future reads as a bug on the PDF.
      const issuedMs = Math.min(new Date(t.updatedAt).getTime(), NOW.getTime());
      t.invoiceGeneratedAt = iso(issuedMs);
      t.invoiceDueDate = iso(issuedMs + 14 * DAY);
      t.paymentStatus = settled ? "paid" : "awaiting_payment";
      if (settled) {
        t.paidAmount = total;
        t.paidAt = iso(Math.min(issuedMs + 3 * DAY, NOW.getTime()));
        t.paymentMethod = "mobile_money";
        t.paymentReference = `MNT-${rint(100000, 999999)}`;
      }
    } else {
      t.paymentStatus = "not_applicable";
    }
  });

  // The PM tests as Mubarak, so guarantee HIM an unpaid maintenance charge.
  const mub = tenants.find((x) => x.id === "ten_mubarak");
  const mubTicket = tickets.find((t) => t.tenantId === "ten_mubarak" && t.cost && (t.status === "completed" || t.status === "closed"))
    ?? tickets.find((t) => t.status === "completed" || t.status === "closed");
  if (mub && mubTicket) {
    mubTicket.tenantId = mub.id;
    mubTicket.unitId = mub.unitId;
    mubTicket.propertyId = mub.propertyId;
    mubTicket.cost = 95_000;
    mubTicket.labourCost = 60_000;
    mubTicket.materialsCost = 35_000;
    mubTicket.title = "Cracked wall in living area";
    mubTicket.resolution = "Crack filled, re-plastered and repainted to match.";
    mubTicket.liability = "tenant";
    mubTicket.liabilityReason = "Damage caused by tenant while mounting a wall unit.";
    mubTicket.invoiceNumber = `INV-${mubTicket.ref}`;
    mubTicket.invoiceAmount = 95_000;
    // Anchor to NOW, not updatedAt — a few tickets carry an updatedAt slightly
    // ahead of NOW, and an invoice must never look like it was issued in the future.
    mubTicket.invoiceGeneratedAt = iso(NOW.getTime() - 4 * DAY);
    mubTicket.invoiceDueDate = iso(NOW.getTime() + 10 * DAY);
    mubTicket.paymentStatus = "awaiting_payment";
    mubTicket.paidAmount = undefined;
    mubTicket.paidAt = undefined;
  }
}

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
    reference: `NX-LD-${rint(100000, 999999)}`,
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

export const staff: Staff[] = ([
  { id: "stf_admin", name: "Aisha Nakato", email: "admin@nexora.co.ug", role: "super_admin", status: "active", since: daysAgo(900), department: "Executive", phone: "+256 772 100 001", availability: "available", assignedJobs: 0 },
  { id: "stf_manager", name: "David Okello", email: "manager@nexora.co.ug", role: "property_manager", status: "active", since: daysAgo(600), department: "Property Management", phone: "+256 772 100 002", availability: "busy", assignedJobs: 6 },
  { id: "stf_finance", name: "Grace Namuli", email: "finance@nexora.co.ug", role: "finance_officer", status: "active", since: daysAgo(540), department: "Finance", phone: "+256 772 100 003", availability: "available", assignedJobs: 2 },
  { id: "stf_ops", name: "Moses Nsubuga", email: emailOf("Moses Nsubuga", "nexora.co.ug"), role: "ops_manager", status: "active", since: daysAgo(480), department: "Operations", phone: "+256 772 100 004", availability: "available", assignedJobs: 4 },
  { id: "stf_maint", name: "James Odoi", email: emailOf("James Odoi", "nexora.co.ug"), role: "maintenance_officer", status: "active", since: daysAgo(360), department: "Maintenance", phone: "+256 772 100 005", availability: "busy", assignedJobs: 9 },
  { id: "stf_pm2", name: "Sharon Kirabo", email: emailOf("Sharon Kirabo", "nexora.co.ug"), role: "property_manager", status: "invited", since: daysAgo(20), department: "Property Management", phone: "+256 772 100 006", availability: "off", assignedJobs: 0 },
] as Staff[]).map((s): Staff => ({ ...s, staffType: "system_user" as const }));

/* ---------------------------------------------- operational staff (E2) --
   Field workers who RECEIVE job assignments but have no platform role and no
   dashboard login. Every name already used as an assignee elsewhere in the mock
   data appears here, so cross-module references resolve to a real Staff record
   (the PM flagged "Fred Wanyama" showing in Service Bookings but not in Staff). */
const OPS_STAFF: { name: string; dept: StaffDepartment; jobTitle: string; avail: StaffAvailability; jobs: number; email?: boolean }[] = [
  // Maintenance — these three are referenced as ticket assignees in the seed.
  { name: "Fred Wanyama", dept: "maintenance", jobTitle: "Plumbing Technician", avail: "busy", jobs: 5, email: true },
  { name: "Peter Ssemakula", dept: "maintenance", jobTitle: "Electrical Technician", avail: "available", jobs: 3, email: true },
  { name: "Alex Mugume", dept: "maintenance", jobTitle: "General Maintenance Technician", avail: "available", jobs: 2 },
  // Cleaning — "SparkleClean Team" is referenced as a service-booking assignee.
  { name: "Sarah Nabirye", dept: "cleaning", jobTitle: "Senior Cleaner", avail: "available", jobs: 4, email: true },
  { name: "Betty Nakimuli", dept: "cleaning", jobTitle: "Cleaning Supervisor", avail: "busy", jobs: 6, email: true },
  { name: "SparkleClean Team", dept: "cleaning", jobTitle: "Cleaning Crew", avail: "available", jobs: 7 },
  // Laundry
  { name: "Joseph Kigongo", dept: "laundry", jobTitle: "Laundry Attendant", avail: "available", jobs: 2 },
  { name: "Miriam Achan", dept: "laundry", jobTitle: "Laundry Supervisor", avail: "available", jobs: 3, email: true },
  // Mobile car wash
  { name: "Ronald Kayemba", dept: "car_wash", jobTitle: "Car Wash Attendant", avail: "available", jobs: 3 },
  { name: "Ivan Ssekandi", dept: "car_wash", jobTitle: "Senior Car Wash Technician", avail: "busy", jobs: 5 },
  // Security
  { name: "Moses Kirunda", dept: "security", jobTitle: "Security Officer", avail: "available", jobs: 1 },
  { name: "Patrick Odongo", dept: "security", jobTitle: "Night Security Officer", avail: "on_leave", jobs: 0 },
  // Transport
  { name: "Julius Bwire", dept: "transport", jobTitle: "Driver", avail: "available", jobs: 2 },
  // Grounds — "GreenScape Crew" is referenced as a service-booking assignee.
  { name: "GreenScape Crew", dept: "other_operations", jobTitle: "Grounds & Landscaping Crew", avail: "available", jobs: 4 },
];

staff.push(
  ...OPS_STAFF.map((o, i) => ({
    id: `stf_ops_${i + 1}`,
    name: o.name,
    email: o.email ? emailOf(o.name, "nexora.co.ug") : undefined,
    status: "active" as const,
    since: daysAgo(int(40, 720)),
    department: o.dept,
    jobTitle: o.jobTitle,
    phone: `+256 77${int(2, 8)} ${int(100, 999)} ${int(100, 999)}`,
    availability: o.avail,
    assignedJobs: o.jobs,
    staffType: "operational_staff" as const,
    address: pick(["Kololo, Kampala", "Ntinda, Kampala", "Kireka, Wakiso", "Najjera, Wakiso", "Bweyogerere, Wakiso"]),
  })),
);

/* -------------------------------------------------------------- users */

// A freshly-onboarded owner used to demo the forced-password-change gate.
export const owners_onboarded: Owner = { id: "own_newowner", name: "Newton Byaruhanga", email: "newowner@test.com", phone: "+256700123123", since: NOW.toISOString(), propertyIds: [] };
owners.push(owners_onboarded);

export const users: MockUser[] = [
  { id: "own_salim", name: "Salim Kato", email: "salim@gmail.com", password: "123456", role: "owner", ownerId: "own_salim", title: "Property Owner" },
  { id: "ten_mubarak", name: "Mubarak Aliyu", email: "mubarak@gmail.com", password: "123456", role: "tenant", tenantId: "ten_mubarak", title: "Resident" },
  { id: "stf_admin", name: "Aisha Nakato", email: "admin@nexora.co.ug", password: "123456", role: "super_admin", staffId: "stf_admin", title: "Super Administrator" },
  { id: "stf_manager", name: "David Okello", email: "manager@nexora.co.ug", password: "123456", role: "property_manager", staffId: "stf_manager", title: "Property Manager" },
  { id: "stf_finance", name: "Grace Namuli", email: "finance@nexora.co.ug", password: "123456", role: "finance_officer", staffId: "stf_finance", title: "Finance Officer" },
  { id: "own_newowner", name: "Newton Byaruhanga", email: "newowner@test.com", password: "TempPass-1234", role: "owner", ownerId: "own_newowner", title: "Property Owner", requiresPasswordChange: true },
];

/** Append a user account (onboarding). Returns the created user. */
export function addUser(u: MockUser): MockUser {
  users.push(u);
  return u;
}

/** Change a user's password + clear the forced-change flag (first login). */
export function changeUserPassword(userId: string, next: string): MockUser | undefined {
  const u = users.find((x) => x.id === userId);
  if (u) { u.password = next; u.requiresPasswordChange = false; }
  return u;
}

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
  let status: BookingStatus;
  if (checkOutMs < NOW.getTime()) status = "checked_out";
  else if (checkInMs <= NOW.getTime()) status = rpick(["checked_in", "checked_in", "cancelled"] as BookingStatus[]);
  else status = rpick(["confirmed", "confirmed", "confirmed", "cancelled"] as BookingStatus[]);
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
    paymentStatus: (status === "cancelled" ? "refunded" : "paid") as "paid" | "refunded",
    paymentReference: `NX-TXN-${rint(100000, 999999)}`,
    paidAt: iso(checkInMs - rint(3, 30) * DAY),
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// Give Mubarak (the demo tenant) a short-term booking history so the tenant
// "My Bookings" view has data (a long-term tenant who also books getaways).
{
  const stay = properties.find((p) => p.id === "entebbe-villas");
  const kira = properties.find((p) => p.id === "kira-gardens");
  const mkBooking = (idx: number, prop: Property | undefined, offsetDays: number, nights: number, status: BookingStatus): Booking | null => {
    if (!prop?.shortTerm) return null;
    const checkInMs = NOW.getTime() + offsetDays * DAY;
    const subtotal = prop.shortTerm.daily * nights + prop.shortTerm.cleaningFee;
    const taxes = Math.round((subtotal * 0.18) / 1000) * 1000;
    return {
      id: `bkg_mub_${idx}`,
      reference: `NX-BK-${rint(100000, 999999)}`,
      propertyId: prop.id,
      propertyName: prop.name,
      guestName: "Mubarak Aliyu",
      guestEmail: "mubarak@gmail.com",
      guestPhone: "+256700000001",
      adults: 2,
      children: 1,
      checkIn: iso(checkInMs),
      checkOut: iso(checkInMs + nights * DAY),
      nights,
      nightlyRate: prop.shortTerm.daily,
      cleaningFee: prop.shortTerm.cleaningFee,
      taxes,
      total: subtotal + taxes,
      paymentMethod: "mobile_money",
      status,
      createdAt: iso(checkInMs - 20 * DAY),
    };
  };
  const mub = [mkBooking(1, stay, -60, 3, "checked_out"), mkBooking(2, kira, 25, 4, "confirmed")].filter(Boolean) as Booking[];
  bookings.push(...mub);
}

const cleaningCats = ["Residential Cleaning", "Commercial Cleaning", "Deep Cleaning", "Move-In/Move-Out", "Event Cleaning", "Facility Cleaning", "Scheduled Programme"];
const lifestyleCats = ["Laundry", "Mobile Car Wash", "Gardening & Lawn", "Janitorial"];
const timeSlots = ["08:00–10:00", "10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00"];
const serviceTechs = ["James Odoi", "Fred Wanyama", "Peter Ssemakula", "SparkleClean Team", "GreenScape Crew"];

export const serviceBookings: ServiceBooking[] = Array.from({ length: 10 }, (_, i) => {
  const kind: ServiceBooking["kind"] = i % 2 === 0 ? "cleaning" : "lifestyle";
  const category = kind === "cleaning" ? rpick(cleaningCats) : rpick(lifestyleCats);
  const name = rFullName();
  const createdMs = NOW.getTime() - rint(1, 40) * DAY;
  // E3: spread across the assessment → invoice → payment → work → confirm lifecycle
  // so every state is demonstrable without manipulating data.
  const LIFECYCLE: ServiceBookingStatus[] = [
    "new", "assigned", "assessment_completed", "awaiting_payment",
    "paid", "in_progress", "completed", "confirmed", "new", "assigned",
  ];
  const status = LIFECYCLE[i];
  const reference = `NX-SV-${rint(100000, 999999)}`;
  const rank = LIFECYCLE.indexOf(status);
  const past = (s: ServiceBookingStatus) => LIFECYCLE.indexOf(s) <= rank && rank > 1;
  const assigned = status !== "new";
  // Everything from "assessment_completed" onward carries a quoted price.
  const assessed = past("assessment_completed");
  const assessedAmount = assessed ? rint(3, 24) * 50_000 : undefined;
  const invoiced = past("awaiting_payment");
  const isPaid = past("paid");
  const assignedBy = assigned ? rpick(serviceTechs) : undefined;
  return {
    id: `svb_${i + 1}`,
    reference,
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
    assignee: assignedBy,
    createdAt: iso(createdMs),
    // Assessment-based pricing — no rate card anywhere.
    assessmentRequired: true,
    assessedBy: assessed ? assignedBy : undefined,
    assessedAt: assessed ? iso(createdMs + 2 * DAY) : undefined,
    assessmentScope: assessed
      ? rpick([
          "3-bedroom apartment, standard clean, 2 bathrooms",
          "5-bedroom bungalow, deep clean incl. kitchen and 3 bathrooms, 2 floors",
          "Ground-floor office suite, ~180 sqm, post-renovation clean",
          "SUV — exterior wash, interior vacuum and dashboard detail",
          "Mixed load, approx. 14 kg, incl. 4 duvets",
        ])
      : undefined,
    assessedAmount,
    invoiceNumber: invoiced ? reference.replace("NX-SV-", "INV-SV-") : undefined,
    invoiceAmount: invoiced ? assessedAmount : undefined,
    invoiceDueDate: invoiced ? iso(createdMs + 9 * DAY) : undefined,
    invoiceGeneratedAt: invoiced ? iso(createdMs + 3 * DAY) : undefined,
    paymentStatus: (isPaid ? "paid" : invoiced ? "awaiting_payment" : "not_invoiced") as ServiceBooking["paymentStatus"],
    paidAmount: isPaid ? assessedAmount : undefined,
    paymentMethod: isPaid ? rpick(["mobile_money", "bank", "card"]) : undefined,
    paymentReference: isPaid ? `NX-TXN-${rint(100000, 999999)}` : undefined,
    paidAt: isPaid ? iso(createdMs + 4 * DAY) : undefined,
    amount: assessedAmount,
    workStartedAt: past("in_progress") ? iso(createdMs + 5 * DAY) : undefined,
    completedBy: past("completed") ? assignedBy : undefined,
    completionNotes: past("completed") ? "Work completed as scoped; client walked through and was satisfied." : undefined,
    confirmedBy: status === "confirmed" ? "David Okello" : undefined,
    confirmedAt: status === "confirmed" ? iso(createdMs + 7 * DAY) : undefined,
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/* ---------------------------------------------------------------------------
 * E5 — cross-module ID backfill.
 *
 * The seed writes staff and property references as display names because those
 * arrays are declared after the records that point at them. This pass runs once
 * the whole graph exists and upgrades every name reference to an id, so nothing
 * in the app has to match on a string that a rename would break.
 * ------------------------------------------------------------------------- */
{
  const staffByName = new Map(staff.map((m) => [m.name, m.id]));
  const propByName = new Map(properties.map((p) => [p.name, p.id]));

  tickets.forEach((t) => { if (t.assignee) t.assigneeId = staffByName.get(t.assignee); });
  serviceBookings.forEach((b) => {
    if (b.assignee) b.assigneeId = staffByName.get(b.assignee);
    if (b.completedBy) b.completedById = staffByName.get(b.completedBy);
  });
  leads.forEach((l) => { if (l.owner) l.ownerStaffId = staffByName.get(l.owner); });
  announcements.forEach((a) => {
    if (a.audience === "property") a.audiencePropertyId = propByName.get(a.audienceLabel);
  });
}

// Seed a few long-term rental inquiries as CRM leads so /admin/bookings and
// /admin/leads show inquiry rows on a fresh load (source: "rental-inquiry").
const longTermProps = properties.filter((p) => p.rentalType === "long-term");
const inquiryStatuses: LeadStatus[] = ["new", "new", "contacted", "qualified", "proposal"];
for (let i = 0; i < 5; i++) {
  const p = rpick(longTermProps);
  const name = rFullName();
  const createdMs = NOW.getTime() - rint(2, 30) * DAY;
  leads.push({
    id: `lead_inq_${i + 1}`,
    name,
    email: rEmail(name),
    phone: rPhone(),
    source: "rental-inquiry",
    service: "Rental Management",
    propertyId: p.id,
    status: rpick(inquiryStatuses),
    value: rint(4, 20) * 500_000,
    createdAt: iso(createdMs),
    owner: "Unassigned",
    activities: [{ id: `act_inq_${i}`, at: iso(createdMs), kind: "note", text: `Rental inquiry for ${p.name}. Preferred move-in within 60 days; lease duration 1 year.` }],
  });
}

/* -------------------------------------------------- management agreements */

export const agreements: ManagementAgreement[] = [
  {
    id: "agr_salim", ownerId: "own_salim", ownerName: "Salim Kato",
    contractType: "revenue_sharing", commissionPercentage: 15,
    effectiveDate: "2026-01-01", expiryDate: "2026-12-31",
    settlementSchedule: "monthly",
    payoutBankName: "Stanbic Bank Uganda", payoutAccountNumber: "9030087651234", payoutAccountName: "Salim Kato",
    status: "active", notes: "Flagship portfolio — reviewed annually.",
    createdAt: daysAgo(190), updatedAt: daysAgo(40),
  },
  {
    id: "agr_rehema", ownerId: "own_rehema", ownerName: "Rehema Ssali",
    contractType: "fixed_fee", fixedAmount: 5_000_000, fixedFrequency: "annual",
    effectiveDate: "2025-09-01", expiryDate: "2026-08-31",
    settlementSchedule: "quarterly",
    payoutBankName: "Absa Bank Uganda", payoutAccountNumber: "6002451188990", payoutAccountName: "Rehema Ssali",
    status: "active",
    createdAt: daysAgo(320), updatedAt: daysAgo(320),
  },
  {
    id: "agr_patrick", ownerId: "own_patrick", ownerName: "Patrick Muwonge",
    contractType: "revenue_sharing", commissionPercentage: 20,
    effectiveDate: "2026-02-01", expiryDate: "2027-01-31",
    settlementSchedule: "monthly",
    payoutBankName: "Centenary Bank", payoutAccountNumber: "3100455667788", payoutAccountName: "Patrick Muwonge",
    status: "active",
    createdAt: daysAgo(160), updatedAt: daysAgo(160),
  },
  {
    id: "agr_sarah", ownerId: "own_sarah", ownerName: "Sarah Nabbanja",
    contractType: "hybrid", hybridFixedAmount: 2_000_000, fixedFrequency: "monthly", hybridPercentage: 10,
    effectiveDate: "2026-03-01", expiryDate: "2027-02-28",
    settlementSchedule: "monthly",
    payoutBankName: "Stanbic Bank Uganda", payoutAccountNumber: "9030044559911", payoutAccountName: "Sarah Nabbanja",
    status: "active", notes: "Base fee plus commission on revenue above the fee threshold.",
    createdAt: daysAgo(120), updatedAt: daysAgo(120),
  },
  {
    id: "agr_ivan", ownerId: "own_ivan", ownerName: "Ivan Katumba",
    contractType: "revenue_sharing", commissionPercentage: 12,
    effectiveDate: "2026-01-15", expiryDate: "2026-12-31",
    settlementSchedule: "quarterly",
    payoutBankName: "DFCU Bank", payoutAccountNumber: "0120033446677", payoutAccountName: "Ivan Katumba",
    status: "active",
    createdAt: daysAgo(175), updatedAt: daysAgo(60),
  },
  {
    id: "agr_diana", ownerId: "own_diana", ownerName: "Diana Achieng",
    contractType: "fixed_fee", fixedAmount: 8_000_000, fixedFrequency: "annual",
    effectiveDate: "2025-11-01", expiryDate: "2026-10-31",
    settlementSchedule: "on_demand",
    payoutBankName: "Equity Bank Uganda", payoutAccountNumber: "1001299887766", payoutAccountName: "Diana Achieng",
    status: "active",
    createdAt: daysAgo(260), updatedAt: daysAgo(90),
  },
  // A historical (expired) agreement so the list demonstrates non-active status.
  {
    id: "agr_salim_prev", ownerId: "own_salim", ownerName: "Salim Kato",
    contractType: "revenue_sharing", commissionPercentage: 12,
    effectiveDate: "2024-01-01", expiryDate: "2025-12-31",
    settlementSchedule: "monthly",
    payoutBankName: "Stanbic Bank Uganda", payoutAccountNumber: "9030087651234", payoutAccountName: "Salim Kato",
    status: "expired",
    createdAt: daysAgo(730), updatedAt: daysAgo(200),
  },
];

/** The active management agreement for an owner (single source of truth for fees). */
export function getAgreementForOwner(ownerId: string): ManagementAgreement | undefined {
  return agreements.find((a) => a.ownerId === ownerId && a.status === "active");
}

/** Settlement can proceed only with an active agreement + payout bank details on file. */
export function isSettlementReady(ownerId: string): boolean {
  const a = getAgreementForOwner(ownerId);
  if (!a) return false;
  const owner = owners.find((o) => o.id === ownerId);
  return Boolean(a.payoutAccountNumber || owner?.accountNumber);
}

/** Processed owner settlements (Revision D). In-memory ledger, resets on reload. */
export const settlements: SettlementRecord[] = [];

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
    reference: `NX-LD-${rint(100000, 999999)}`,
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

/* ==================================================================
 * SERVICE CATALOGUE SEED (F1)
 *
 * The STRUCTURE here is real — it mirrors what was discussed on 27 Aug. The
 * PRICES are deliberately obvious round placeholders, and every service type
 * ships with `pricesConfirmed: false` so the admin UI keeps warning that these
 * are not final until the stakeholder's price list is entered.
 *
 * The admin can change every single value below, including the service types
 * themselves. Nothing here is depended on by any component.
 * ================================================================== */

const CAT_NOW = NOW.toISOString();
let _stSeq = 0, _scSeq = 0, _ciSeq = 0;

export const serviceTypes: ServiceType[] = [];
export const serviceCategories: ServiceCategory[] = [];
export const catalogueItems: CatalogueItem[] = [];
/** Accepted quotations (price-snapshotted). Empty until a customer accepts one. */
export const quotations: Quotation[] = [];

function seedType(name: string, icon: string, description: string, bookingRoute: string | null, sortOrder: number) {
  const st: ServiceType = {
    id: `svt_${++_stSeq}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description,
    icon,
    bookingRoute,
    active: true,
    sortOrder,
    pricesConfirmed: false, // placeholder pricing until the real list lands
    createdAt: CAT_NOW,
    updatedAt: CAT_NOW,
  };
  serviceTypes.push(st);
  return st;
}

function seedCategory(
  st: ServiceType, name: string, selectionMode: ServiceCategory["selectionMode"],
  required: boolean, sortOrder: number, description: string | null = null,
) {
  const sc: ServiceCategory = {
    id: `svc_${++_scSeq}`,
    serviceTypeId: st.id,
    name, description, selectionMode, required,
    active: true, sortOrder,
  };
  serviceCategories.push(sc);
  return sc;
}

function seedItem(
  sc: ServiceCategory, name: string, unit: string, price: number, sortOrder: number,
  opts: Partial<Pick<CatalogueItem, "description" | "minQuantity" | "maxQuantity" | "requiresDescription" | "excludeFromTotal">> = {},
) {
  catalogueItems.push({
    id: `cit_${++_ciSeq}`,
    serviceTypeId: sc.serviceTypeId,
    categoryId: sc.id,
    name,
    description: opts.description ?? null,
    unit,
    price,
    currency: "UGX",
    minQuantity: opts.minQuantity ?? 0,
    maxQuantity: opts.maxQuantity ?? 20,
    requiresDescription: opts.requiresDescription ?? false,
    excludeFromTotal: opts.excludeFromTotal ?? false,
    active: true,
    sortOrder,
    createdAt: CAT_NOW,
    updatedAt: CAT_NOW,
  });
}

{
  /* ---- Cleaning ---- */
  const cleaning = seedType("Cleaning", "Home", "Room-by-room residential and office cleaning.", "/book/cleaning", 1);
  const rooms = seedCategory(cleaning, "Rooms", "quantity", true, 1, "Tell us how many of each room needs cleaning.");
  seedItem(rooms, "Bedroom", "per room", 20_000, 1);
  seedItem(rooms, "Bathroom", "per room", 15_000, 2);
  seedItem(rooms, "Kitchen", "per room", 25_000, 3);
  seedItem(rooms, "Living Room", "per room", 30_000, 4);
  const addons = seedCategory(cleaning, "Add-ons", "multi_choice", false, 2, "Optional extras.");
  seedItem(addons, "Carpet Cleaning", "per service", 50_000, 1);
  seedItem(addons, "Windows", "per service", 40_000, 2);
  seedItem(addons, "Balcony", "per service", 20_000, 3);

  /* ---- Laundry ---- */
  const laundry = seedType("Laundry", "Tools", "Wash, dry, fold and dry cleaning.", "/book/lifestyle", 2);
  const wash = seedCategory(laundry, "Wash Service", "single_choice", true, 1, "Choose one wash service.");
  seedItem(wash, "Wash & Fold", "per kg", 5_000, 1);
  seedItem(wash, "Wash, Dry & Fold", "per kg", 8_000, 2);
  const dry = seedCategory(laundry, "Dry Cleaning", "quantity", false, 2, "Priced per item.");
  ["Shirt", "Trousers", "Suit", "Dress", "Coat", "Bedsheet", "Curtain", "Blanket"].forEach((n, i) =>
    seedItem(dry, n, "per item", 10_000 + i * 5_000, i + 1),
  );
  const other = seedCategory(laundry, "Other Items", "quantity", false, 3, "Anything not listed above.");
  seedItem(other, "Other Item", "per item", 0, 1, {
    description: "Describe the item and we will quote it separately.",
    requiresDescription: true,
    excludeFromTotal: true,
  });

  /* ---- Mobile Car Wash ---- */
  const carwash = seedType("Mobile Car Wash", "MapPin", "We come to you.", "/book/lifestyle", 3);
  const washType = seedCategory(carwash, "Wash Type", "single_choice", true, 1, "Choose one.");
  seedItem(washType, "Interior Wash", "per vehicle", 30_000, 1);
  seedItem(washType, "Exterior Wash", "per vehicle", 25_000, 2);
  seedItem(washType, "Full Wash", "per vehicle", 50_000, 3);
}
