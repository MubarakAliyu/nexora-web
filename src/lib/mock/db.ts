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
  Building,
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
  { id: "muyenga-heights", name: "Muyenga Heights", location: "Muyenga, Kampala", category: "Residential", image: "/images/properties/tower-white-woodbalcony.jpg", ownerId: "own_rehema", status: "managed", units: 36, occupancy: 89 },
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
  const startMs = opts?.active ? NOW.getTime() - 210 * DAY : NOW.getTime() - int(60, 900) * DAY;
  const term = opts?.active ? 365 : pick([180, 365, 365, 730]);
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

/* ------------------------------------------------------------ helpers */

export const NOW_ISO = NOW.toISOString();
export function findUser(email: string, password: string): MockUser | undefined {
  const e = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === e && u.password === password);
}
