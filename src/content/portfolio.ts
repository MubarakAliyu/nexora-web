/**
 * Portfolio & Projects content (typed). Images reference /public/images/properties/.
 * Single source for /portfolio, /portfolio/[slug] and /projects.
 */

export type Category =
  | "Residential"
  | "Commercial"
  | "Condominiums"
  | "Institutional"
  | "Managed Facilities";

export const categories: Category[] = [
  "Residential",
  "Commercial",
  "Condominiums",
  "Institutional",
  "Managed Facilities",
];

export interface ScopeItem {
  icon: string;
  text: string;
}

export interface ResultMetric {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface Property {
  slug: string;
  name: string;
  location: string;
  category: Category;
  excerpt: string;
  image: string;
  gallery: string[];
  /** Card key stats. */
  units: number;
  occupancy: number;
  /** Detail spec sheet. */
  details: SpecItem[];
  scope: ScopeItem[];
  results: ResultMetric[];
  related: string[];
}

export const properties: Property[] = [
  {
    slug: "nakasero-heights",
    name: "Nakasero Heights",
    location: "Nakasero, Kampala",
    category: "Residential",
    excerpt: "A 48-unit premium residential tower under full Nexora management.",
    image: "/images/properties/tower-curved-balcony.jpg",
    gallery: [
      "/images/properties/tower-curved-balcony.jpg",
      "/images/properties/interior-living-room.jpg",
      "/images/properties/tower-poolside.jpg",
    ],
    units: 48,
    occupancy: 98,
    details: [
      { label: "Type", value: "Residential tower" },
      { label: "Units", value: "48 apartments" },
      { label: "Location", value: "Nakasero, Kampala" },
      { label: "Status", value: "Fully managed" },
    ],
    scope: [
      { icon: "home", text: "Leasing & rent collection" },
      { icon: "cog", text: "Facilities & maintenance" },
      { icon: "shield", text: "Security & concierge" },
      { icon: "chart", text: "Owner financial reporting" },
    ],
    results: [
      { label: "Occupancy", value: 98, suffix: "%" },
      { label: "Occupancy uplift", value: 22, prefix: "+", suffix: "%" },
      { label: "On-time rent", value: 96, suffix: "%" },
    ],
    related: ["munyonyo-suites", "kololo-court", "entebbe-villas"],
  },
  {
    slug: "munyonyo-suites",
    name: "Munyonyo Suites",
    location: "Munyonyo, Kampala",
    category: "Residential",
    excerpt: "Lakeside serviced apartments with concierge-grade resident services.",
    image: "/images/properties/tower-poolside.jpg",
    gallery: [
      "/images/properties/tower-poolside.jpg",
      "/images/properties/villa-infinity-pool.jpg",
      "/images/properties/interior-living-room.jpg",
    ],
    units: 60,
    occupancy: 95,
    details: [
      { label: "Type", value: "Serviced apartments" },
      { label: "Units", value: "60 suites" },
      { label: "Location", value: "Munyonyo, Kampala" },
      { label: "Status", value: "Fully managed" },
    ],
    scope: [
      { icon: "home", text: "Short & long-stay leasing" },
      { icon: "sparkles", text: "Housekeeping & cleaning" },
      { icon: "shield", text: "24/7 security & concierge" },
      { icon: "chart", text: "Revenue optimisation" },
    ],
    results: [
      { label: "Occupancy", value: 95, suffix: "%" },
      { label: "Revenue growth", value: 18, prefix: "+", suffix: "%" },
      { label: "Satisfaction", value: 97, suffix: "%" },
    ],
    related: ["nakasero-heights", "entebbe-villas", "bugolobi-lofts"],
  },
  {
    slug: "entebbe-villas",
    name: "Entebbe Villas",
    location: "Entebbe",
    category: "Residential",
    excerpt: "A private villa collection managed for diaspora owners.",
    image: "/images/properties/villas-dusk.jpg",
    gallery: [
      "/images/properties/villas-dusk.jpg",
      "/images/properties/villa-garden-pool.jpg",
      "/images/properties/villa-infinity-pool.jpg",
    ],
    units: 12,
    occupancy: 92,
    details: [
      { label: "Type", value: "Villa collection" },
      { label: "Units", value: "12 villas" },
      { label: "Location", value: "Entebbe" },
      { label: "Status", value: "Managed for owners" },
    ],
    scope: [
      { icon: "home", text: "Rental & tenant management" },
      { icon: "eye", text: "Remote owner transparency" },
      { icon: "cog", text: "Grounds & maintenance" },
      { icon: "protection", text: "Asset protection" },
    ],
    results: [
      { label: "Occupancy", value: 92, suffix: "%" },
      { label: "Owner reporting", value: 100, suffix: "%" },
      { label: "Response time cut", value: 40, prefix: "-", suffix: "%" },
    ],
    related: ["nakasero-heights", "munyonyo-suites", "jinja-riverside"],
  },
  {
    slug: "kololo-court",
    name: "Kololo Court",
    location: "Kololo, Kampala",
    category: "Condominiums",
    excerpt: "A boutique condominium with full association management.",
    image: "/images/properties/apartment-facade.jpg",
    gallery: [
      "/images/properties/apartment-facade.jpg",
      "/images/properties/interior-living-room.jpg",
      "/images/properties/tower-white-woodbalcony.jpg",
    ],
    units: 24,
    occupancy: 100,
    details: [
      { label: "Type", value: "Condominium" },
      { label: "Units", value: "24 units" },
      { label: "Location", value: "Kololo, Kampala" },
      { label: "Status", value: "Association managed" },
    ],
    scope: [
      { icon: "quality", text: "Association administration" },
      { icon: "chart", text: "Service-charge budgeting" },
      { icon: "cog", text: "Common-area upkeep" },
      { icon: "shield", text: "Access control" },
    ],
    results: [
      { label: "Occupancy", value: 100, suffix: "%" },
      { label: "Fee collection", value: 99, suffix: "%" },
      { label: "Satisfaction", value: 95, suffix: "%" },
    ],
    related: ["bugolobi-lofts", "nakasero-heights", "lugogo-offices"],
  },
  {
    slug: "bugolobi-lofts",
    name: "Bugolobi Lofts",
    location: "Bugolobi, Kampala",
    category: "Condominiums",
    excerpt: "Modern loft condominiums with concierge and facilities management.",
    image: "/images/properties/tower-white-woodbalcony.jpg",
    gallery: [
      "/images/properties/tower-white-woodbalcony.jpg",
      "/images/properties/interior-living-room.jpg",
      "/images/properties/apartment-facade.jpg",
    ],
    units: 18,
    occupancy: 94,
    details: [
      { label: "Type", value: "Condominium" },
      { label: "Units", value: "18 lofts" },
      { label: "Location", value: "Bugolobi, Kampala" },
      { label: "Status", value: "Fully managed" },
    ],
    scope: [
      { icon: "quality", text: "Association management" },
      { icon: "cog", text: "Facilities & systems" },
      { icon: "sparkles", text: "Common-area cleaning" },
      { icon: "chart", text: "Owner reporting" },
    ],
    results: [
      { label: "Occupancy", value: 94, suffix: "%" },
      { label: "Cost savings", value: 15, prefix: "-", suffix: "%" },
      { label: "Satisfaction", value: 96, suffix: "%" },
    ],
    related: ["kololo-court", "munyonyo-suites", "ntinda-plaza"],
  },
  {
    slug: "lugogo-offices",
    name: "Lugogo Offices",
    location: "Lugogo, Kampala",
    category: "Commercial",
    excerpt: "A commercial office block with full facility management.",
    image: "/images/properties/twin-towers-dusk.jpg",
    gallery: [
      "/images/properties/twin-towers-dusk.jpg",
      "/images/properties/tower-white-woodbalcony.jpg",
    ],
    units: 16,
    occupancy: 90,
    details: [
      { label: "Type", value: "Commercial offices" },
      { label: "Lettable", value: "16 suites" },
      { label: "Location", value: "Lugogo, Kampala" },
      { label: "Status", value: "Facility managed" },
    ],
    scope: [
      { icon: "cog", text: "Building systems & HVAC" },
      { icon: "shield", text: "Security & access" },
      { icon: "tools", text: "Maintenance coordination" },
      { icon: "chart", text: "Tenant billing" },
    ],
    results: [
      { label: "Occupancy", value: 90, suffix: "%" },
      { label: "Downtime cut", value: 35, prefix: "-", suffix: "%" },
      { label: "Tenant retention", value: 92, suffix: "%" },
    ],
    related: ["ntinda-plaza", "kololo-court", "jinja-riverside"],
  },
  {
    slug: "ntinda-plaza",
    name: "Ntinda Plaza",
    location: "Ntinda, Kampala",
    category: "Commercial",
    excerpt: "A mixed-use commercial plaza with retail and office space.",
    image: "/images/properties/villa-minimalist.jpg",
    gallery: [
      "/images/properties/villa-minimalist.jpg",
      "/images/properties/aerial-neighbourhood.jpg",
    ],
    units: 30,
    occupancy: 88,
    details: [
      { label: "Type", value: "Mixed-use plaza" },
      { label: "Units", value: "30 retail & office" },
      { label: "Location", value: "Ntinda, Kampala" },
      { label: "Status", value: "Fully managed" },
    ],
    scope: [
      { icon: "building", text: "Retail & office leasing" },
      { icon: "cog", text: "Facilities management" },
      { icon: "shield", text: "Security & parking" },
      { icon: "chart", text: "Revenue reporting" },
    ],
    results: [
      { label: "Occupancy", value: 88, suffix: "%" },
      { label: "Footfall growth", value: 20, prefix: "+", suffix: "%" },
      { label: "Retention", value: 90, suffix: "%" },
    ],
    related: ["lugogo-offices", "bugolobi-lofts", "kampala-facilities"],
  },
  {
    slug: "jinja-riverside",
    name: "Jinja Riverside",
    location: "Jinja",
    category: "Institutional",
    excerpt: "An institutional residential estate with integrated management.",
    image: "/images/properties/aerial-neighbourhood.jpg",
    gallery: [
      "/images/properties/aerial-neighbourhood.jpg",
      "/images/properties/residential-street.jpg",
      "/images/properties/suburban-house.jpg",
    ],
    units: 40,
    occupancy: 93,
    details: [
      { label: "Type", value: "Institutional estate" },
      { label: "Units", value: "40 homes" },
      { label: "Location", value: "Jinja" },
      { label: "Status", value: "Fully managed" },
    ],
    scope: [
      { icon: "home", text: "Estate & tenant management" },
      { icon: "cog", text: "Infrastructure upkeep" },
      { icon: "shield", text: "Estate security" },
      { icon: "chart", text: "Governance reporting" },
    ],
    results: [
      { label: "Occupancy", value: 93, suffix: "%" },
      { label: "Occupancy uplift", value: 17, prefix: "+", suffix: "%" },
      { label: "Satisfaction", value: 94, suffix: "%" },
    ],
    related: ["entebbe-villas", "kampala-facilities", "nakasero-heights"],
  },
  {
    slug: "kampala-facilities",
    name: "Kampala Facilities",
    location: "Greater Kampala",
    category: "Managed Facilities",
    excerpt: "A portfolio of managed facilities across greater Kampala.",
    image: "/images/properties/residential-street.jpg",
    gallery: [
      "/images/properties/residential-street.jpg",
      "/images/properties/suburban-house.jpg",
      "/images/properties/aerial-neighbourhood.jpg",
    ],
    units: 25,
    occupancy: 91,
    details: [
      { label: "Type", value: "Managed facilities" },
      { label: "Sites", value: "25 facilities" },
      { label: "Location", value: "Greater Kampala" },
      { label: "Status", value: "Facility managed" },
    ],
    scope: [
      { icon: "cog", text: "Preventive maintenance" },
      { icon: "tools", text: "Vendor coordination" },
      { icon: "shield", text: "Safety & compliance" },
      { icon: "chart", text: "Cost control" },
    ],
    results: [
      { label: "Uptime", value: 99, suffix: "%" },
      { label: "Cost savings", value: 18, prefix: "-", suffix: "%" },
      { label: "Response time cut", value: 40, prefix: "-", suffix: "%" },
    ],
    related: ["jinja-riverside", "lugogo-offices", "ntinda-plaza"],
  },
];

export const propertySlugs = properties.map((p) => p.slug);

export function getProperty(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

/** Extra spec + location metadata per property (address, approx. coords for the
 *  map, and highlight specs). Coords are Kampala-area approximations. */
export interface PropertyMeta {
  address: string;
  lat: number;
  lng: number;
  year: string;
  parking: string;
  size: string;
}

export const propertyMeta: Record<string, PropertyMeta> = {
  "nakasero-heights": { address: "Nakasero Hill, Kampala, Uganda", lat: 0.33, lng: 32.58, year: "2021", parking: "2 levels", size: "6,400 m²" },
  "munyonyo-suites": { address: "Munyonyo, Kampala, Uganda", lat: 0.2586, lng: 32.63, year: "2020", parking: "Ample", size: "8,100 m²" },
  "entebbe-villas": { address: "Lake Victoria Rd, Entebbe, Uganda", lat: 0.0512, lng: 32.4637, year: "2019", parking: "Private", size: "5,200 m²" },
  "kololo-court": { address: "Kololo, Kampala, Uganda", lat: 0.335, lng: 32.595, year: "2022", parking: "Basement", size: "3,600 m²" },
  "bugolobi-lofts": { address: "Bugolobi, Kampala, Uganda", lat: 0.318, lng: 32.615, year: "2021", parking: "Secure", size: "2,800 m²" },
  "lugogo-offices": { address: "Lugogo Bypass, Kampala, Uganda", lat: 0.333, lng: 32.605, year: "2018", parking: "Multi-level", size: "4,500 m²" },
  "ntinda-plaza": { address: "Ntinda, Kampala, Uganda", lat: 0.362, lng: 32.618, year: "2020", parking: "Customer", size: "5,900 m²" },
  "jinja-riverside": { address: "Nile Crescent, Jinja, Uganda", lat: 0.4244, lng: 33.2041, year: "2017", parking: "On-site", size: "9,300 m²" },
  "kampala-facilities": { address: "Greater Kampala, Uganda", lat: 0.3476, lng: 32.5825, year: "Various", parking: "Varies", size: "25 sites" },
};

export function getPropertyMeta(slug: string): PropertyMeta {
  return (
    propertyMeta[slug] ?? {
      address: "Kampala, Uganda",
      lat: 0.3476,
      lng: 32.5825,
      year: "—",
      parking: "—",
      size: "—",
    }
  );
}

export const portfolioHero = {
  eyebrow: "Our Portfolio",
  title: "Properties under Nexora management.",
  subtitle:
    "Residential towers, condominiums, commercial plazas and managed facilities — each run to the same standard of transparency and care.",
  image: "/images/properties/twin-towers-dusk.jpg",
  imageAlt: "Twin residential towers at dusk",
};

export const portfolioFeature = {
  quote: "Every property tells a story of value protected and potential unlocked.",
  image: "/images/properties/villa-infinity-pool.jpg",
  imageAlt: "Modern villa with infinity pool",
};

export const portfolioStats: ResultMetric[] = [
  { label: "Properties managed", value: 45, suffix: "+" },
  { label: "Units under management", value: 1200, suffix: "+" },
  { label: "Average occupancy", value: 95, suffix: "%" },
  { label: "Owner satisfaction", value: 96, suffix: "%" },
];

export const portfolioCta = {
  heading: "Add your property to our portfolio.",
  subline:
    "Join the owners who trust Nexora to protect and grow their assets — with a free, no-obligation assessment.",
  primary: { label: "Request a Free Assessment", href: "/contact" },
  image: "/images/properties/villas-dusk.jpg",
  imageAlt: "Luxury villas at dusk",
};

/* --------------------------------------------------- Projects / Transformations */

export const projectsHero = {
  eyebrow: "Projects & Transformations",
  title: "Results you can see.",
  subtitle:
    "From cleaning and upgrades to occupancy turnarounds and facility overhauls — the measurable impact of Nexora management.",
  image: "/images/properties/interior-living-room.jpg",
  imageAlt: "Beautifully finished residential interior",
};

export interface BeforeAfterItem {
  title: string;
  desc: string;
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
}

export const beforeAfters: BeforeAfterItem[] = [
  {
    title: "Common-area refresh",
    desc: "A tired residential exterior brought back to a premium standard through deep cleaning and upkeep.",
    before: "/images/properties/residential-street.jpg",
    after: "/images/properties/villas-dusk.jpg",
    beforeAlt: "Property before Nexora upkeep",
    afterAlt: "Property after Nexora upkeep",
  },
  {
    title: "Interior transformation",
    desc: "An unfurnished unit staged and finished to lift rental value and reduce time-to-let.",
    before: "/images/properties/suburban-house.jpg",
    after: "/images/properties/interior-living-room.jpg",
    beforeAlt: "Unit before transformation",
    afterAlt: "Unit after transformation",
  },
];

export interface TransformationStory {
  eyebrow: string;
  heading: string;
  body: string[];
  image: string;
  imageAlt: string;
}

export const transformationStories: TransformationStory[] = [
  {
    eyebrow: "Occupancy turnaround",
    heading: "From 70% to 95% occupancy in six months.",
    body: [
      "A struggling residential tower came to Nexora with high vacancy and inconsistent collections. We repositioned pricing, refreshed common areas and professionalised leasing.",
      "Within six months, occupancy climbed to 95% and rent arrears fell dramatically.",
    ],
    image: "/images/properties/tower-curved-balcony.jpg",
    imageAlt: "Residential tower with improved occupancy",
  },
  {
    eyebrow: "Facility overhaul",
    heading: "Reliable systems, lower running costs.",
    body: [
      "By moving a commercial building from reactive repairs to planned, preventive maintenance, we cut downtime and emergency spend.",
      "Tenants noticed the difference — and retention improved alongside the savings.",
    ],
    image: "/images/properties/twin-towers-dusk.jpg",
    imageAlt: "Commercial towers with upgraded facilities",
  },
];

export const impactMetrics: ResultMetric[] = [
  { label: "Average occupancy uplift", value: 22, prefix: "+", suffix: "%" },
  { label: "Operating cost savings", value: 18, prefix: "-", suffix: "%" },
  { label: "Faster maintenance response", value: 40, prefix: "-", suffix: "%" },
  { label: "Resident satisfaction", value: 96, suffix: "%" },
];

export interface SuccessStory {
  name: string;
  category: string;
  result: string;
  image: string;
}

export const successStories: SuccessStory[] = [
  {
    name: "Nakasero Heights",
    category: "Residential",
    result: "Occupancy lifted to 98% with fully transparent owner reporting.",
    image: "/images/properties/tower-curved-balcony.jpg",
  },
  {
    name: "Lugogo Offices",
    category: "Commercial",
    result: "Downtime cut by 35% through preventive facility management.",
    image: "/images/properties/twin-towers-dusk.jpg",
  },
  {
    name: "Kampala Facilities",
    category: "Managed Facilities",
    result: "99% uptime and 18% cost savings across 25 sites.",
    image: "/images/properties/residential-street.jpg",
  },
];

export const projectsCta = {
  heading: "Ready for results like these?",
  subline:
    "Let Nexora show you what professional, transparent management can do for your property.",
  primary: { label: "Request a Free Assessment", href: "/contact" },
  image: "/images/properties/villas-dusk.jpg",
  imageAlt: "Luxury villas at dusk",
};
