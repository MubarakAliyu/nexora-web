/**
 * Homepage content — all copy/data lives here (typed) so components stay presentational.
 * Images reference real files in /public/images/properties/.
 */

export interface HeroSlide {
  eyebrow: string;
  headlineLines: string[];
  subline: string;
  cta: { label: string; href: string };
  image: string;
  imageAlt: string;
}

export const heroSlides: HeroSlide[] = [
  {
    eyebrow: "Nexora Property Management",
    headlineLines: ["Managing Properties.", "Maximizing Value."],
    subline:
      "Full-service, technology-driven property management across Uganda — protecting your asset and elevating every resident’s experience.",
    cta: { label: "Request a Quote", href: "/contact" },
    image: "/images/properties/villas-dusk.jpg",
    imageAlt: "Luxury Nexora-managed villas at dusk",
  },
  {
    eyebrow: "For Owners & Investors",
    headlineLines: ["Your Asset,", "Expertly Managed."],
    subline:
      "Transparent monthly reporting, international-grade governance and hands-off ownership — whether you live next door or across the world.",
    cta: { label: "Explore Properties", href: "/portfolio" },
    image: "/images/properties/tower-curved-balcony.jpg",
    imageAlt: "Modern apartment tower with curved balconies managed by Nexora",
  },
  {
    eyebrow: "For Residents",
    headlineLines: ["Living,", "Elevated."],
    subline:
      "Effortless rent, responsive maintenance and concierge-grade care — a home experience that goes beyond just a place to live.",
    cta: { label: "Book a Consultation", href: "/investors" },
    image: "/images/properties/tower-poolside.jpg",
    imageAlt: "Poolside view of a Nexora-managed residential tower",
  },
];

export interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

export const stats: Stat[] = [
  { value: 1200, suffix: "+", label: "Units under management" },
  { value: 98, suffix: "%", label: "Average occupancy" },
  { value: 12, suffix: "", label: "Years of experience" },
  { value: 96, suffix: "%", label: "Client satisfaction" },
  { value: 340, suffix: "+", label: "Owners served" },
];

export const about = {
  eyebrow: "About Nexora",
  heading: "Integrated property management, built on trust.",
  body: [
    "Nexora is a Kampala-based property management company delivering rental, condominium and facility management under one accountable roof — backed by the international governance of Groupe M-Zi Inc. (Canada).",
    "We combine local operational excellence with global standards of transparency, so owners enjoy true peace of mind and residents enjoy a home that is cared for.",
  ],
  cta: { label: "Learn more about us", href: "/about" },
  image: "/images/properties/interior-living-room.jpg",
  imageAlt: "Warm, professionally managed residential interior",
};

export interface ServiceItem {
  title: string;
  blurb: string;
  slug: string;
  icon: string;
}

export const services: ServiceItem[] = [
  { title: "Property Management", blurb: "End-to-end management of residential and mixed-use properties.", slug: "property-management", icon: "building" },
  { title: "Rental Management", blurb: "Tenant sourcing, leasing, rent collection and renewals.", slug: "rental-management", icon: "home" },
  { title: "Facility Management", blurb: "Building systems, common areas and vendor coordination.", slug: "facility-management", icon: "cog" },
  { title: "Cleaning & Housekeeping", blurb: "Premium cleaning for homes, offices and common spaces.", slug: "premium-cleaning", icon: "sparkles" },
  { title: "Security & Concierge", blurb: "Trained security and concierge-grade resident services.", slug: "security-concierge", icon: "shield" },
  { title: "Maintenance Coordination", blurb: "Fast, tracked repairs with trusted technicians.", slug: "maintenance-coordination", icon: "tools" },
  { title: "Mobile Car Wash", blurb: "On-site vehicle care as a resident convenience.", slug: "mobile-car-wash", icon: "vehicle" },
  { title: "Asset Optimisation", blurb: "Data-driven strategies to grow your property’s value.", slug: "asset-optimisation", icon: "chart" },
];

export interface ValueProp {
  title: string;
  blurb: string;
  icon: string;
}

export const whyChoose: ValueProp[] = [
  { title: "International Governance", blurb: "Groupe M-Zi Inc. standards bring global accountability to local management.", icon: "globe" },
  { title: "Radical Transparency", blurb: "Clear monthly statements and real-time visibility into your property.", icon: "eye" },
  { title: "Certified Quality", blurb: "Consistent, audited standards across every service we deliver.", icon: "quality" },
  { title: "Always Responsive", blurb: "A dedicated team and support that answers when you need it.", icon: "support" },
  { title: "Asset Protection", blurb: "Proactive maintenance and diligence that safeguard your investment.", icon: "protection" },
  { title: "Proven Track Record", blurb: "Over a decade of managing properties and maximizing value.", icon: "award" },
];

export interface Project {
  name: string;
  location: string;
  title: string;
  description: string;
  image: string;
  href: string;
}

export const projects: Project[] = [
  {
    name: "Nakasero Heights",
    location: "Kampala",
    title: "Nakasero Heights",
    description:
      "A 48-unit premium residential tower under full Nexora management — from leasing and rent collection to facilities and concierge.",
    image: "/images/properties/tower-curved-balcony.jpg",
    href: "/portfolio",
  },
  {
    name: "Kololo Court",
    location: "Kampala",
    title: "Kololo Court",
    description:
      "A boutique condominium where Nexora handles association management, maintenance and owner reporting end-to-end.",
    image: "/images/properties/apartment-facade.jpg",
    href: "/portfolio",
  },
  {
    name: "Munyonyo Suites",
    location: "Kampala",
    title: "Munyonyo Suites",
    description:
      "Lakeside serviced apartments with concierge-grade resident services and optimised occupancy year-round.",
    image: "/images/properties/tower-poolside.jpg",
    href: "/portfolio",
  },
  {
    name: "Entebbe Villas",
    location: "Entebbe",
    title: "Entebbe Villas",
    description:
      "A private villa collection managed for diaspora owners — remote transparency with on-the-ground care.",
    image: "/images/properties/villas-dusk.jpg",
    href: "/portfolio",
  },
  {
    name: "Naguru Ridge",
    location: "Kampala",
    title: "Naguru Ridge",
    description:
      "Twin residential towers with full facility management, security and maintenance coordination.",
    image: "/images/properties/twin-towers-dusk.jpg",
    href: "/portfolio",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Nexora manages my apartments as if they were their own. The monthly reports are clear and the occupancy has never been higher.",
    name: "Sarah Nakato",
    role: "Property Owner, Kampala",
  },
  {
    quote:
      "As a diaspora investor, trust is everything. Nexora gives me complete transparency and true peace of mind from thousands of miles away.",
    name: "David Okello",
    role: "Investor, London",
  },
  {
    quote:
      "From maintenance requests to rent payments, everything is effortless. It genuinely feels like a premium place to live.",
    name: "Grace Auma",
    role: "Resident, Munyonyo Suites",
  },
];

export const ctaBanner = {
  heading: "Request a Free Property Assessment",
  subline:
    "Discover how Nexora can protect your asset, lift your occupancy and simplify ownership. No obligation.",
  primary: { label: "Request a Free Assessment", href: "/contact" },
  image: "/images/properties/villas-dusk.jpg",
  imageAlt: "Luxury villas at dusk",
};
