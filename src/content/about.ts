/**
 * About page content (typed). Images reference /public/images/properties/.
 */

export const aboutHero = {
  eyebrow: "About Nexora",
  title: "Property management, elevated by trust.",
  subtitle:
    "A Kampala-based property management company delivering global standards of transparency and care — with the discipline and accountability owners can rely on.",
  image: "/images/properties/villa-minimalist.jpg",
  imageAlt: "Minimalist white villa managed by Nexora",
};

export const aboutStory = {
  eyebrow: "Our story",
  heading: "Built in Kampala. Governed to global standards.",
  body: [
    "Nexora was founded to close a simple gap: property owners in Uganda deserved management that is as transparent, accountable and professional as anything in the world’s leading markets.",
    "We operate on the ground across Kampala and beyond — leasing, collecting, maintaining and caring for residential, commercial and institutional properties — while holding ourselves to international standards of reporting and governance.",
    "The result is a company that combines local operational excellence with the discipline and clarity that owners, investors and residents can rely on.",
  ],
  image: "/images/properties/aerial-neighbourhood.jpg",
  imageAlt: "Aerial view of a residential neighbourhood",
};

export const visionMission = {
  vision: {
    label: "Our Vision",
    text: "To be East Africa’s most trusted property management company — the standard others are measured against.",
  },
  mission: {
    label: "Our Mission",
    text: "To protect and grow the value of every property we manage, while making ownership effortless and living exceptional.",
  },
  pullStatement:
    "We manage properties the way we would want our own managed — with care, candour and relentless attention to detail.",
  image: "/images/properties/tower-curved-balcony.jpg",
  imageAlt: "Modern apartment tower with curved balconies",
};

export interface CoreValue {
  title: string;
  blurb: string;
  icon: string;
}

export const coreValues: CoreValue[] = [
  { title: "Integrity", blurb: "We do what is right, especially when no one is watching.", icon: "shield" },
  { title: "Transparency", blurb: "Clear reporting and honest communication, always.", icon: "eye" },
  { title: "Excellence", blurb: "We hold every service to an audited, consistent standard.", icon: "quality" },
  { title: "Accountability", blurb: "We own outcomes and answer for our work.", icon: "protection" },
  { title: "Care", blurb: "We treat every property and resident with genuine respect.", icon: "support" },
  { title: "Innovation", blurb: "We use technology and data to manage smarter.", icon: "chart" },
];

export interface Leader {
  name: string;
  role: string;
  initials: string;
  bio: string;
}

export const leadership: Leader[] = [
  {
    name: "Aliyu Mubarak",
    role: "Managing Director",
    initials: "AM",
    bio: "Leads Nexora’s vision, strategy and design-led approach to property management.",
  },
  {
    name: "Sarah Namutebi",
    role: "Head of Operations",
    initials: "SN",
    bio: "Oversees on-the-ground management, facilities and service delivery across the portfolio.",
  },
  {
    name: "David Mukasa",
    role: "Head of Finance",
    initials: "DM",
    bio: "Owns transparent reporting, owner disbursements and financial governance.",
  },
  {
    name: "Grace Atim",
    role: "Head of Client Experience",
    initials: "GA",
    bio: "Champions owner and resident relationships, care standards and communication.",
  },
];

export interface RoadmapPhase {
  phase: string;
  title: string;
  period: string;
  points: string[];
}

export const roadmap: RoadmapPhase[] = [
  {
    phase: "Phase 01",
    title: "Foundation",
    period: "Now",
    points: [
      "Full-service management across Kampala",
      "Transparent monthly owner reporting",
      "Integrated maintenance & facilities",
    ],
  },
  {
    phase: "Phase 02",
    title: "Expansion",
    period: "Next",
    points: [
      "Coverage across major Ugandan cities",
      "Owner & tenant self-service portals",
      "Dedicated investor services desk",
    ],
  },
  {
    phase: "Phase 03",
    title: "Leadership",
    period: "Future",
    points: [
      "Regional presence across East Africa",
      "Data-driven asset optimisation at scale",
      "The benchmark for governance & trust",
    ],
  },
];

export const aboutCta = {
  heading: "Let’s manage your property, properly.",
  subline:
    "Partner with a team that treats your asset like its own — with transparency, care and global standards.",
  primary: { label: "Get in touch", href: "/contact" },
  image: "/images/cta/cta-management.jpg",
  imageAlt: "Property owner reviewing a floor plan at home",
};
