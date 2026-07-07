/**
 * Services content (typed) — powers /services and every /services/[slug] page.
 * Slugs here are the single source of truth for the dynamic route.
 */

export interface SubService {
  icon: string;
  title: string;
  desc: string;
}

export interface Service {
  slug: string;
  title: string;
  /** One-line promise shown in the hero. */
  promise: string;
  icon: string;
  /** Short blurb for the services index card. */
  excerpt: string;
  heroImage: string;
  overviewImage: string;
  overview: string[];
  included: SubService[];
  forWho: string[];
  pricingNote: string;
  /** Slugs of 2–3 related services. */
  related: string[];
}

export const services: Service[] = [
  {
    slug: "rental-management",
    title: "Rental Management",
    promise: "Fill units faster, collect on time, and keep tenants longer.",
    icon: "home",
    excerpt: "Tenant sourcing, leasing, rent collection and renewals — handled end-to-end.",
    heroImage: "/images/properties/tower-curved-balcony.jpg",
    overviewImage: "/images/properties/interior-living-room.jpg",
    overview: [
      "We manage the full rental lifecycle so your units stay occupied and your income stays predictable. From marketing and tenant screening to leasing, rent collection and renewals, Nexora handles every step with transparency.",
      "You receive clear monthly statements and real-time visibility — while we handle the day-to-day.",
    ],
    included: [
      { icon: "eye", title: "Marketing & listing", desc: "Professional listings and targeted marketing to minimise vacancy." },
      { icon: "shield", title: "Tenant screening", desc: "Thorough background and reference checks on every applicant." },
      { icon: "quality", title: "Leasing & renewals", desc: "Watertight lease agreements, renewals and turnover management." },
      { icon: "chart", title: "Rent collection", desc: "Reliable collection with transparent tracking and follow-up." },
    ],
    forWho: [
      "Individual landlords and owners",
      "Diaspora owners wanting hands-off income",
      "Investors with multi-unit residential properties",
    ],
    pricingNote:
      "Typically a percentage of collected rent — you only pay when your property earns. Exact terms are tailored to your portfolio.",
    related: ["property-management", "condominium-management", "maintenance-coordination"],
  },
  {
    slug: "property-management",
    title: "Property Management",
    promise: "One accountable partner for the entire life of your property.",
    icon: "building",
    excerpt: "End-to-end management of residential and mixed-use properties.",
    heroImage: "/images/properties/tower-poolside.jpg",
    overviewImage: "/images/properties/apartment-facade.jpg",
    overview: [
      "Our flagship service brings leasing, finance, maintenance, facilities and reporting under one roof. We act as the single point of accountability for your property — so you deal with one trusted team, not a dozen vendors.",
      "Every decision is guided by protecting your asset and maximizing its long-term value.",
    ],
    included: [
      { icon: "home", title: "Tenancy management", desc: "Full leasing, rent and tenant relationship management." },
      { icon: "cog", title: "Operations", desc: "Day-to-day running of the building and its systems." },
      { icon: "chart", title: "Financial reporting", desc: "Transparent monthly statements and owner disbursements." },
      { icon: "protection", title: "Asset protection", desc: "Proactive upkeep that preserves and grows value." },
    ],
    forWho: [
      "Owners of residential and mixed-use buildings",
      "Investors seeking a single accountable manager",
      "Developers handing over completed projects",
    ],
    pricingNote:
      "A management fee scaled to the size and complexity of your property. We’ll propose a clear, all-inclusive structure.",
    related: ["rental-management", "facility-management", "asset-optimisation"],
  },
  {
    slug: "condominium-management",
    title: "Condominium Management",
    promise: "Well-run associations, happy residents, protected value.",
    icon: "building",
    excerpt: "Association management, shared facilities, budgets and owner reporting.",
    heroImage: "/images/properties/apartment-facade.jpg",
    overviewImage: "/images/properties/tower-curved-balcony.jpg",
    overview: [
      "Condominiums thrive on fair governance and well-managed shared spaces. Nexora administers associations professionally — budgets, service charges, common-area upkeep and clear communication with every owner.",
      "We keep the community running smoothly and the building’s value protected.",
    ],
    included: [
      { icon: "quality", title: "Association admin", desc: "Meetings, records, bylaws and owner communication." },
      { icon: "chart", title: "Budgets & levies", desc: "Transparent service-charge budgeting and collection." },
      { icon: "cog", title: "Common areas", desc: "Maintenance of shared facilities and amenities." },
      { icon: "shield", title: "Compliance", desc: "Governance that keeps the association accountable." },
    ],
    forWho: [
      "Condominium associations and boards",
      "Developers of multi-owner buildings",
      "Owners within managed condominiums",
    ],
    pricingNote:
      "A per-unit or whole-association fee agreed with the board — structured for fairness and transparency.",
    related: ["property-management", "facility-management", "security-concierge"],
  },
  {
    slug: "facility-management",
    title: "Facility Management",
    promise: "Buildings that run reliably, safely and efficiently.",
    icon: "cog",
    excerpt: "Building systems, common areas, vendors and preventive upkeep.",
    heroImage: "/images/properties/aerial-neighbourhood.jpg",
    overviewImage: "/images/properties/twin-towers-dusk.jpg",
    overview: [
      "We keep the physical building performing — electrical, plumbing, HVAC, lifts, generators, water and common areas — through planned, preventive maintenance and trusted vendor coordination.",
      "Fewer breakdowns, lower costs, and a safer environment for everyone.",
    ],
    included: [
      { icon: "cog", title: "Building systems", desc: "Preventive maintenance of core building services." },
      { icon: "shield", title: "Safety & compliance", desc: "Fire, security and regulatory compliance checks." },
      { icon: "support", title: "Vendor management", desc: "Vetted contractors, coordinated and quality-checked." },
      { icon: "chart", title: "Cost control", desc: "Planned upkeep that reduces emergency spend." },
    ],
    forWho: [
      "Owners of apartment and commercial buildings",
      "Condominium associations",
      "Institutional and mixed-use facilities",
    ],
    pricingNote:
      "A recurring facilities fee based on building size and systems — with optional planned-maintenance packages.",
    related: ["property-management", "maintenance-coordination", "security-concierge"],
  },
  {
    slug: "premium-cleaning",
    title: "Premium Cleaning & Housekeeping",
    promise: "Immaculate spaces, every single day.",
    icon: "sparkles",
    excerpt: "Premium cleaning for homes, offices and common spaces.",
    heroImage: "/images/properties/interior-living-room.jpg",
    overviewImage: "/images/properties/villa-minimalist.jpg",
    overview: [
      "Presentation matters. Our trained housekeeping teams deliver hotel-grade cleaning for private homes, offices and building common areas — scheduled or on demand, always to a consistent standard.",
      "Clean, cared-for spaces that residents and visitors notice.",
    ],
    included: [
      { icon: "sparkles", title: "Deep & routine cleaning", desc: "Scheduled and one-off cleaning to a premium standard." },
      { icon: "home", title: "Housekeeping", desc: "Ongoing housekeeping for homes and serviced units." },
      { icon: "cog", title: "Common areas", desc: "Lobbies, corridors and shared amenities kept pristine." },
      { icon: "quality", title: "Quality checks", desc: "Supervised teams with consistent, audited results." },
    ],
    forWho: [
      "Homeowners and serviced-apartment operators",
      "Offices and commercial tenants",
      "Buildings needing common-area care",
    ],
    pricingNote:
      "Priced per visit or on a monthly plan, based on space and frequency. Bundled free within many management packages.",
    related: ["property-management", "facility-management", "mobile-car-wash"],
  },
  {
    slug: "security-concierge",
    title: "Security & Concierge",
    promise: "Peace of mind at the door, and a warm welcome beyond it.",
    icon: "shield",
    excerpt: "Trained security and concierge-grade resident services.",
    heroImage: "/images/properties/villas-dusk.jpg",
    overviewImage: "/images/properties/villa-infinity-pool.jpg",
    overview: [
      "Safety and service go hand in hand. We provide trained security personnel and access control alongside concierge services that make residents feel looked after — from visitor management to everyday requests.",
      "Secure, welcoming buildings that people are proud to call home.",
    ],
    included: [
      { icon: "shield", title: "Manned security", desc: "Trained guards and 24/7 access control." },
      { icon: "eye", title: "Surveillance", desc: "Monitoring and visitor management systems." },
      { icon: "support", title: "Concierge desk", desc: "Front-desk assistance and resident services." },
      { icon: "quality", title: "Standards", desc: "Professional, vetted and consistently supervised teams." },
    ],
    forWho: [
      "Residential towers and gated communities",
      "Condominiums and serviced apartments",
      "Commercial and institutional properties",
    ],
    pricingNote:
      "Staffed on a monthly basis by coverage level and site — scoped precisely to your building’s needs.",
    related: ["facility-management", "condominium-management", "property-management"],
  },
  {
    slug: "maintenance-coordination",
    title: "Maintenance Coordination",
    promise: "Repairs done fast, tracked, and done right.",
    icon: "tools",
    excerpt: "Fast, tracked repairs with trusted technicians.",
    heroImage: "/images/properties/suburban-house.jpg",
    overviewImage: "/images/properties/residential-street.jpg",
    overview: [
      "When something breaks, response time matters. We coordinate a network of vetted technicians and track every request from report to resolution — with clear updates and transparent costs.",
      "Less downtime, no runaround, and a full record of the work done.",
    ],
    included: [
      { icon: "tools", title: "Request handling", desc: "Simple reporting and rapid dispatch of technicians." },
      { icon: "support", title: "Vetted technicians", desc: "Trusted trades for plumbing, electrical and more." },
      { icon: "eye", title: "Status tracking", desc: "Transparent updates from report to completion." },
      { icon: "chart", title: "Cost transparency", desc: "Clear, approved costs with a full work record." },
    ],
    forWho: [
      "Owners and landlords",
      "Tenants within managed properties",
      "Associations needing reliable repairs",
    ],
    pricingNote:
      "Coordination is included in management plans; standalone work is quoted transparently before approval.",
    related: ["facility-management", "property-management", "rental-management"],
  },
  {
    slug: "mobile-car-wash",
    title: "Mobile Car Wash",
    promise: "A spotless car, without leaving home.",
    icon: "vehicle",
    excerpt: "On-site vehicle care as a resident convenience.",
    heroImage: "/images/properties/villa-infinity-pool.jpg",
    overviewImage: "/images/properties/villa-garden-pool.jpg",
    overview: [
      "A modern convenience that residents love. Our mobile team washes and details vehicles on-site at the buildings we manage — a simple perk that adds everyday value to the living experience.",
      "Booked in minutes, delivered at the parking bay.",
    ],
    included: [
      { icon: "vehicle", title: "On-site wash", desc: "Exterior and interior cleaning at your parking bay." },
      { icon: "sparkles", title: "Detailing", desc: "Premium detailing options on request." },
      { icon: "support", title: "Easy booking", desc: "Simple scheduling for residents." },
      { icon: "quality", title: "Consistent care", desc: "Trained team, dependable results." },
    ],
    forWho: [
      "Residents of managed buildings",
      "Serviced-apartment operators",
      "Owners adding resident amenities",
    ],
    pricingNote:
      "Pay-per-wash or resident subscription — an optional amenity offered across managed properties.",
    related: ["premium-cleaning", "security-concierge", "property-management"],
  },
  {
    slug: "asset-optimisation",
    title: "Asset Optimisation",
    promise: "Turn a well-run property into a better-performing asset.",
    icon: "chart",
    excerpt: "Data-driven strategies to grow your property’s value.",
    heroImage: "/images/properties/twin-towers-dusk.jpg",
    overviewImage: "/images/properties/tower-poolside.jpg",
    overview: [
      "Beyond day-to-day management, we help owners make their assets work harder. Using occupancy, pricing and cost data, we identify opportunities to lift income, reduce spend and increase long-term value.",
      "Clear recommendations, backed by the numbers.",
    ],
    included: [
      { icon: "chart", title: "Performance analysis", desc: "Occupancy, revenue and cost benchmarking." },
      { icon: "eye", title: "Pricing strategy", desc: "Data-informed rent and positioning advice." },
      { icon: "quality", title: "Value improvements", desc: "Targeted upgrades with the best return." },
      { icon: "protection", title: "Risk review", desc: "Protecting income and long-term asset value." },
    ],
    forWho: [
      "Investors and portfolio owners",
      "Diaspora owners seeking stronger returns",
      "Developers planning new projects",
    ],
    pricingNote:
      "Offered as an advisory add-on or bundled into full management — scoped to your goals.",
    related: ["property-management", "rental-management", "facility-management"],
  },
];

export const serviceSlugs = services.map((s) => s.slug);

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const servicesIndexHero = {
  eyebrow: "Our Services",
  title: "Everything your property needs, under one roof.",
  subtitle:
    "From leasing and finance to facilities, cleaning, security and asset strategy — Nexora is the single accountable partner for your property.",
  image: "/images/properties/tower-poolside.jpg",
  imageAlt: "Poolside view of a managed residential tower",
};

export interface ProcessStep {
  step: string;
  title: string;
  desc: string;
}

export const processSteps: ProcessStep[] = [
  { step: "01", title: "Consult", desc: "We learn your property, goals and expectations." },
  { step: "02", title: "Onboard", desc: "We assess, document and take over operations cleanly." },
  { step: "03", title: "Manage", desc: "We run the day-to-day with transparent reporting." },
  { step: "04", title: "Optimise", desc: "We refine performance to grow long-term value." },
];

export const servicesCta = {
  heading: "Not sure which service you need?",
  subline:
    "Tell us about your property and we’ll recommend the right mix — with a free, no-obligation assessment.",
  primary: { label: "Request a Free Assessment", href: "/contact" },
  image: "/images/properties/villas-dusk.jpg",
  imageAlt: "Luxury villas at dusk",
};
