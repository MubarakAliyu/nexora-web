/**
 * Services content (typed) — powers /services and every /services/[slug] page.
 * Slugs here are the single source of truth for the dynamic route.
 *
 * Six service categories (Nexora revision). Each carries a service-specific CTA.
 */

export interface SubService {
  icon: string;
  title: string;
  desc: string;
}

export interface ServiceCta {
  label: string;
  href: string;
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
  /** Service-specific call to action. */
  cta: ServiceCta;
  /** Slugs of 2–3 related services. */
  related: string[];
}

export const services: Service[] = [
  {
    slug: "property-management",
    title: "Property Management",
    promise: "One accountable partner for the entire life of your property.",
    icon: "building",
    excerpt: "End-to-end management of residential, commercial and mixed-use properties.",
    heroImage: "/images/properties/tower-poolside.jpg",
    overviewImage: "/images/properties/apartment-facade.jpg",
    overview: [
      "Our flagship service brings tenants, leases, rent, inspections, maintenance, vendors, security and reporting under one roof. Nexora becomes the single point of accountability for your property — so you deal with one trusted team, not a dozen vendors.",
      "Every decision is guided by protecting your asset and maximizing its long-term value, with transparent monthly reporting for full visibility.",
    ],
    included: [
      { icon: "home", title: "Tenant management", desc: "Screening, onboarding and day-to-day tenant relationships." },
      { icon: "quality", title: "Lease administration", desc: "Watertight agreements, renewals and turnover handled end-to-end." },
      { icon: "chart", title: "Rent collection", desc: "Reliable collection with transparent tracking and follow-up." },
      { icon: "eye", title: "Property inspections", desc: "Scheduled inspections that catch issues before they escalate." },
      { icon: "tools", title: "Maintenance coordination", desc: "Vetted technicians dispatched and tracked — for Nexora-managed properties." },
      { icon: "support", title: "Vendor coordination", desc: "Trusted contractors sourced, coordinated and quality-checked." },
      { icon: "shield", title: "Security services", desc: "Trained personnel and access control where required." },
      { icon: "protection", title: "Property reporting", desc: "Clear monthly statements and owner disbursements." },
    ],
    forWho: [
      "Owners of residential, commercial and mixed-use buildings",
      "Investors seeking a single accountable manager",
      "Developers handing over completed projects",
    ],
    pricingNote:
      "A management fee scaled to the size and complexity of your property. We’ll propose a clear, all-inclusive structure. Maintenance is offered only for properties under Nexora management, not as a standalone service.",
    cta: { label: "Contact an Advisor", href: "/contact" },
    related: ["rental-management", "condominium-management", "asset-optimization"],
  },
  {
    slug: "rental-management",
    title: "Rental Management",
    promise: "Fill units faster, collect on time, and keep tenants longer.",
    icon: "home",
    excerpt: "Long- and short-term rentals, tenant placement and occupancy management.",
    heroImage: "/images/high-view-toy-model-house-keys.jpg",
    overviewImage: "/images/african-american-homeowners-holding-keys-new-household-property-bought-mortgage-loan-move-together-enjoying-real-estate-relocation-life-event-new-beginnings-close-up.jpg",
    overview: [
      "We manage the full rental lifecycle so your units stay occupied and your income stays predictable. Nexora handles two distinct rental workflows — long-term tenancies and short-term stays — under one transparent service.",
      "From marketing and tenant placement to lease coordination and occupancy management, you get clear reporting and real-time visibility while we handle the day-to-day.",
    ],
    included: [
      { icon: "home", title: "Long-term rentals", desc: "Full tenancy management for six-month and annual leases." },
      { icon: "sparkles", title: "Short-term rentals", desc: "Furnished, serviced stays with instant online booking." },
      { icon: "shield", title: "Tenant placement", desc: "Sourcing, screening and placing the right tenants faster." },
      { icon: "chart", title: "Occupancy management", desc: "Pricing and availability tuned to keep units earning." },
      { icon: "quality", title: "Lease coordination", desc: "Agreements, renewals and handovers coordinated cleanly." },
    ],
    forWho: [
      "Individual landlords and owners",
      "Diaspora owners wanting hands-off rental income",
      "Investors with multi-unit residential properties",
    ],
    pricingNote:
      "Typically a percentage of collected rent — you only pay when your property earns. Short-term stays are priced per night with a transparent service fee.",
    cta: { label: "Browse Properties", href: "/rentals" },
    related: ["property-management", "housekeeping-cleaning", "asset-optimization"],
  },
  {
    slug: "condominium-management",
    title: "Condominium Management",
    promise: "Well-run associations, happy residents, protected value.",
    icon: "quality",
    excerpt: "Association management, shared facilities, security and resident coordination.",
    heroImage: "/images/properties/apartment-facade.jpg",
    overviewImage: "/images/properties/tower-curved-balcony.jpg",
    overview: [
      "Condominiums thrive on fair governance and well-managed shared spaces. Nexora administers associations professionally — facilities, resident coordination, security, concierge, common areas and vendor management, all handled with clear communication to every owner.",
      "We keep the community running smoothly and the building’s value protected.",
    ],
    included: [
      { icon: "cog", title: "Facility management", desc: "Building systems and shared infrastructure kept running." },
      { icon: "support", title: "Resident coordination", desc: "Meetings, records and clear owner communication." },
      { icon: "shield", title: "Security services", desc: "Trained guards and access control across the community." },
      { icon: "quality", title: "Concierge services", desc: "Front-desk assistance and everyday resident support." },
      { icon: "tools", title: "Maintenance coordination", desc: "Common-area repairs dispatched and tracked to completion." },
      { icon: "home", title: "Common area management", desc: "Lobbies, amenities and grounds maintained to standard." },
      { icon: "eye", title: "Vendor coordination", desc: "Vetted contractors managed and quality-checked." },
    ],
    forWho: [
      "Condominium associations and boards",
      "Developers of multi-owner buildings",
      "Owners within managed condominiums",
    ],
    pricingNote:
      "A per-unit or whole-association fee agreed with the board — structured for fairness and transparency.",
    cta: { label: "Request Consultation", href: "/contact" },
    related: ["property-management", "home-lifestyle", "asset-optimization"],
  },
  {
    slug: "housekeeping-cleaning",
    title: "Housekeeping & Cleaning Services",
    promise: "Immaculate spaces, every single time.",
    icon: "sparkles",
    excerpt: "Residential, commercial, deep, move-in/out, event and scheduled cleaning.",
    heroImage: "/images/properties/interior-living-room.jpg",
    overviewImage: "/images/properties/villa-minimalist.jpg",
    overview: [
      "Presentation matters. Our trained teams deliver hotel-grade cleaning for homes, offices, facilities and events — booked on demand or on a scheduled programme, always to a consistent, audited standard.",
      "From routine housekeeping to intensive deep cleans, every job is supervised and quality-checked so spaces look and feel their best.",
    ],
    included: [
      { icon: "home", title: "Residential cleaning", desc: "Homes and serviced apartments kept spotless." },
      { icon: "building", title: "Commercial cleaning", desc: "Offices, retail and workspaces cleaned to standard." },
      { icon: "sparkles", title: "Deep cleaning", desc: "Kitchen, bathroom, carpet, mattress and upholstery deep cleans." },
      { icon: "tools", title: "Move-in / move-out", desc: "Turnover cleaning that gets units ready to let." },
      { icon: "award", title: "Event cleaning", desc: "Pre- and post-event cleaning for venues and functions." },
      { icon: "cog", title: "Facility cleaning", desc: "Common areas and building facilities kept pristine." },
      { icon: "chart", title: "Scheduled programmes", desc: "Daily, weekly, monthly or contract cleaning plans." },
    ],
    forWho: [
      "Homeowners and serviced-apartment operators",
      "Offices, retail and commercial tenants",
      "Facilities, venues and event organisers",
    ],
    pricingNote:
      "Priced per visit or on a monthly plan, based on space and frequency. Bundled free within many management packages.",
    cta: { label: "Book Cleaning", href: "/book/cleaning" },
    related: ["home-lifestyle", "property-management", "condominium-management"],
  },
  {
    slug: "home-lifestyle",
    title: "Home & Lifestyle Services",
    promise: "Everyday convenience, delivered to your door.",
    icon: "vehicle",
    excerpt: "Laundry, janitorial, gardening, mobile car wash and scheduled programmes.",
    heroImage: "/images/properties/villa-infinity-pool.jpg",
    overviewImage: "/images/properties/villa-garden-pool.jpg",
    overview: [
      "The lifestyle services residents love, run to a professional standard. From laundry and hospitality linen to gardening, janitorial care and mobile car wash — booked in minutes with pickup, delivery and scheduling handled for you.",
      "A simple set of everyday perks that add real value to the living experience across the buildings we manage.",
    ],
    included: [
      { icon: "sparkles", title: "Laundry services", desc: "Wash, dry-clean, fold and iron with pickup & delivery." },
      { icon: "building", title: "Hospitality laundry", desc: "Linen and uniform laundry for hotels, hospitals and institutions." },
      { icon: "support", title: "Pickup & delivery", desc: "Scheduled collection and drop-off that fits your routine." },
      { icon: "cog", title: "Janitorial services", desc: "Ongoing janitorial care for homes and workspaces." },
      { icon: "home", title: "Gardening & lawn care", desc: "Landscaping and grounds maintenance kept sharp." },
      { icon: "vehicle", title: "Mobile car wash", desc: "Private, fleet, interior and exterior valeting on-site." },
      { icon: "chart", title: "Scheduled wash programmes", desc: "Recurring wash and care plans for residents and fleets." },
    ],
    forWho: [
      "Residents of managed buildings",
      "Hotels, hospitals and institutional clients",
      "Owners adding resident amenities and fleet operators",
    ],
    pricingNote:
      "Pay-per-service or a recurring subscription — an optional amenity offered across managed properties.",
    cta: { label: "Book Service", href: "/book/lifestyle" },
    related: ["housekeeping-cleaning", "property-management", "condominium-management"],
  },
  {
    slug: "asset-optimization",
    title: "Asset Optimization & Advisory",
    promise: "Turn a well-run property into a better-performing asset.",
    icon: "chart",
    excerpt: "Performance analysis, revenue optimization and investment advisory.",
    heroImage: "/images/properties/twin-towers-dusk.jpg",
    overviewImage: "/images/properties/tower-poolside.jpg",
    overview: [
      "Beyond day-to-day management, we help owners make their assets work harder. Using occupancy, pricing and cost data, Nexora identifies opportunities to lift income, reduce spend and grow long-term value.",
      "Clear, data-backed recommendations and strategy — from valuation support to portfolio growth planning.",
    ],
    included: [
      { icon: "chart", title: "Property performance analysis", desc: "Occupancy, revenue and cost benchmarking." },
      { icon: "eye", title: "Occupancy optimization", desc: "Availability and demand strategies that keep units earning." },
      { icon: "quality", title: "Revenue optimization", desc: "Data-informed pricing and positioning advice." },
      { icon: "protection", title: "Asset valuation support", desc: "Valuation guidance to inform your decisions." },
      { icon: "award", title: "Investment advisory", desc: "Guidance for acquiring and improving income assets." },
      { icon: "globe", title: "Portfolio growth strategy", desc: "Long-term planning to scale your holdings." },
      { icon: "cog", title: "Operational efficiency", desc: "Consulting that trims cost and lifts performance." },
    ],
    forWho: [
      "Investors and portfolio owners",
      "Diaspora owners seeking stronger returns",
      "Developers planning new projects",
    ],
    pricingNote:
      "Offered as an advisory add-on or bundled into full management — scoped to your goals.",
    cta: { label: "Schedule Consultation", href: "/contact" },
    related: ["property-management", "rental-management", "condominium-management"],
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
    "From property, rental and condominium management to housekeeping, home & lifestyle services and asset advisory — Nexora is the single accountable partner for your property.",
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
  image: "/images/cta/cta-services.jpg",
  imageAlt: "Property manager reviewing plans on a tablet",
};
