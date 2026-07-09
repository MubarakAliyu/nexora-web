/** Careers page content (typed). */

export const careersHero = {
  eyebrow: "Careers",
  title: "Build the future of property management.",
  subtitle:
    "Join a team that combines local operational excellence with global standards — and treats every property, and every colleague, with care.",
  image: "/images/properties/tower-white-woodbalcony.jpg",
  imageAlt: "Modern apartment tower against a blue sky",
};

export interface Position {
  title: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
}

export const positions: Position[] = [
  {
    title: "Property Manager",
    location: "Kampala, Uganda",
    type: "Full-time",
    description:
      "Own the day-to-day management of a portfolio of residential properties — leasing, tenant relationships, maintenance coordination and owner reporting.",
    requirements: [
      "3+ years in property or facilities management",
      "Excellent communication and organisation",
      "A service mindset and attention to detail",
      "Comfort with property management software",
    ],
  },
  {
    title: "Maintenance Officer",
    location: "Kampala, Uganda",
    type: "Full-time",
    description:
      "Coordinate maintenance requests end-to-end, manage a network of vetted technicians, and keep our buildings running reliably.",
    requirements: [
      "Technical/trades background or facilities experience",
      "Strong vendor-management skills",
      "A proactive, problem-solving approach",
    ],
  },
  {
    title: "Finance Officer",
    location: "Kampala, Uganda",
    type: "Full-time",
    description:
      "Own transparent financial reporting, owner disbursements and reconciliations — the backbone of the trust we offer clients.",
    requirements: [
      "Accounting qualification or equivalent experience",
      "Meticulous, numbers-driven and discreet",
      "Experience with financial reporting tools",
    ],
  },
  {
    title: "Client Experience Associate",
    location: "Kampala, Uganda",
    type: "Full-time",
    description:
      "Be the responsive, friendly voice of Nexora for owners and residents — handling requests and championing our care standards.",
    requirements: [
      "2+ years in a customer-facing role",
      "Warm, clear communicator across channels",
      "Calm under pressure and genuinely helpful",
    ],
  },
];

export interface Benefit {
  title: string;
  blurb: string;
  icon: string;
}

export const benefits: Benefit[] = [
  { title: "Growth & training", blurb: "Real investment in your development and career path.", icon: "chart" },
  { title: "Supportive team", blurb: "A collaborative culture that has your back.", icon: "support" },
  { title: "Global standards", blurb: "Work to international-grade governance and practices.", icon: "globe" },
  { title: "Meaningful work", blurb: "Care for properties and people that matter.", icon: "award" },
  { title: "Modern tools", blurb: "Technology that makes your work easier, not harder.", icon: "cog" },
  { title: "Recognition", blurb: "We see and reward excellence and integrity.", icon: "quality" },
];

export const culture = {
  eyebrow: "Our culture",
  heading: "Care, candour and craftsmanship.",
  body: [
    "We hold ourselves to the standard we promise our clients: do what’s right, communicate honestly, and take pride in the details.",
    "It’s a place where good people do their best work — and are trusted to.",
  ],
  image: "/images/properties/interior-living-room.jpg",
  imageAlt: "Warm, professionally managed interior",
};

export const careersCta = {
  heading: "Don’t see the right role?",
  subline:
    "We’re always keen to meet talented, values-driven people. Send us your details and CV.",
  primary: { label: "Apply anyway", href: "#apply" },
  image: "/images/properties/villas-dusk.jpg",
  imageAlt: "Luxury villas at dusk",
};
