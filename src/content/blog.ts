/** Blog content (typed). Structured so a CMS/API can replace it later. */

export const blogCategories = [
  "Property Tips",
  "Investment",
  "Maintenance",
  "Facility Management",
  "Market Updates",
  "Investor Education",
] as const;

export type BlogCategory = (typeof blogCategories)[number];

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  date: string;
  author: string;
  readingTime: string;
  image: string;
  imageAlt: string;
  content: string[];
}

export const posts: Post[] = [
  {
    slug: "maximise-rental-income-uganda",
    title: "5 ways to maximise your rental income in Uganda",
    excerpt: "Small, deliberate decisions can meaningfully lift what your property earns. Here are five that work.",
    category: "Property Tips",
    date: "2025-06-02",
    author: "Sarah Namutebi",
    readingTime: "5 min read",
    image: "/images/properties/tower-curved-balcony.jpg",
    imageAlt: "Modern apartment tower",
    content: [
      "Rental income isn’t just about the headline rent — it’s about occupancy, retention and cost control working together.",
      "First, price to the market, not to a hunch. Data-informed pricing keeps you competitive and minimises costly vacancy.",
      "Second, invest in presentation. Clean, well-finished units let faster and command better rent. Third, keep good tenants: responsive maintenance and clear communication reduce turnover, which is where income quietly leaks away.",
      "Finally, control costs with preventive maintenance and transparent vendor management — and review performance regularly so you can act on what the numbers tell you.",
    ],
  },
  {
    slug: "diaspora-investor-guide",
    title: "The diaspora investor’s guide to remote ownership",
    excerpt: "Owning property back home from abroad is easier than you think — with the right partner and the right visibility.",
    category: "Investor Education",
    date: "2025-05-18",
    author: "David Mukasa",
    readingTime: "6 min read",
    image: "/images/properties/villa-infinity-pool.jpg",
    imageAlt: "Villa with infinity pool",
    content: [
      "For many in the diaspora, investing back home is deeply personal — and understandably cautious. Distance breeds uncertainty.",
      "The answer is transparency. When you can see income, expenses and occupancy every month, ownership stops feeling like a leap of faith and starts feeling like a spreadsheet you control.",
      "Choose a manager with international governance, clear reporting and a responsive team across time zones. That combination turns remote ownership into genuine peace of mind.",
    ],
  },
  {
    slug: "preventive-maintenance-saves-money",
    title: "Why preventive maintenance saves you money",
    excerpt: "Reactive repairs are expensive and disruptive. A planned approach protects both your budget and your building.",
    category: "Maintenance",
    date: "2025-05-04",
    author: "Grace Atim",
    readingTime: "4 min read",
    image: "/images/properties/twin-towers-dusk.jpg",
    imageAlt: "Twin residential towers at dusk",
    content: [
      "Every emergency repair carries a hidden premium: rush costs, tenant disruption and, often, secondary damage that could have been avoided.",
      "Preventive maintenance flips the model. Scheduled inspections and servicing catch small issues before they become expensive ones, and keep building systems running reliably.",
      "The result is lower total spend, longer asset life and happier residents — a better outcome for everyone.",
    ],
  },
  {
    slug: "understanding-occupancy-rates",
    title: "Understanding occupancy — the metric that matters most",
    excerpt: "Occupancy quietly drives your returns. Here’s how to read it and how to improve it.",
    category: "Investment",
    date: "2025-04-21",
    author: "David Mukasa",
    readingTime: "5 min read",
    image: "/images/properties/tower-poolside.jpg",
    imageAlt: "Poolside residential tower",
    content: [
      "A single point of occupancy can move your annual return more than most owners realise. Vacancy is the silent cost of property ownership.",
      "Improving occupancy starts with pricing and presentation, but retention is where the durable gains live. Keep tenants happy and your occupancy — and income — stays high.",
      "Track it monthly, benchmark it, and treat every avoidable vacancy as a problem worth solving.",
    ],
  },
  {
    slug: "facility-management-explained",
    title: "Facility management, explained",
    excerpt: "What facility management actually covers — and why it’s the backbone of a well-run building.",
    category: "Facility Management",
    date: "2025-04-08",
    author: "Sarah Namutebi",
    readingTime: "4 min read",
    image: "/images/properties/aerial-neighbourhood.jpg",
    imageAlt: "Aerial view of a neighbourhood",
    content: [
      "Facility management is the unglamorous work that keeps a building safe, comfortable and efficient — electrical, plumbing, HVAC, lifts, water, security and common areas.",
      "Done well, it’s invisible: everything simply works. Done poorly, it’s a constant source of complaints and cost.",
      "Professional facility management moves you from reactive firefighting to planned, preventive care — protecting both experience and value.",
    ],
  },
  {
    slug: "kampala-property-market-2025",
    title: "The Kampala property market in 2025",
    excerpt: "A brief look at the trends shaping demand, supply and returns across greater Kampala.",
    category: "Market Updates",
    date: "2025-03-25",
    author: "David Mukasa",
    readingTime: "6 min read",
    image: "/images/properties/apartment-facade.jpg",
    imageAlt: "Modern apartment facade",
    content: [
      "Greater Kampala continues to see steady demand for well-managed residential and mixed-use property, particularly in established neighbourhoods.",
      "Quality and management increasingly differentiate performance: professionally managed buildings command better occupancy and retention.",
      "For owners and investors, the message is consistent — the quality of management is now a core driver of returns.",
    ],
  },
  {
    slug: "choosing-a-property-manager",
    title: "How to choose a property manager you can trust",
    excerpt: "The questions to ask before you hand over your most valuable asset.",
    category: "Property Tips",
    date: "2025-03-10",
    author: "Grace Atim",
    readingTime: "5 min read",
    image: "/images/properties/villa-minimalist.jpg",
    imageAlt: "Minimalist white villa",
    content: [
      "Handing over your property is an act of trust. Before you do, ask how a manager reports, how they handle maintenance, and how they protect your asset.",
      "Look for transparency you can verify, standards that are audited, and a team that answers when you need them.",
      "The right partner doesn’t just manage your property — they give you back your time and your peace of mind.",
    ],
  },
  {
    slug: "condominium-governance-basics",
    title: "Condominium governance basics for owners",
    excerpt: "Well-run associations protect value. Here’s what good governance looks like.",
    category: "Investor Education",
    date: "2025-02-24",
    author: "Sarah Namutebi",
    readingTime: "4 min read",
    image: "/images/properties/tower-white-woodbalcony.jpg",
    imageAlt: "White apartment building with wood balconies",
    content: [
      "In a condominium, your investment depends partly on how well the whole building is governed — budgets, service charges and shared spaces.",
      "Good governance means fair, transparent administration and consistent upkeep of common areas.",
      "Professional association management keeps the community running smoothly and the building’s value protected for every owner.",
    ],
  },
];

export const postSlugs = posts.map((p) => p.slug);

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export const blogHero = {
  eyebrow: "Insights",
  title: "The Nexora blog.",
  subtitle:
    "Practical guidance on property management, investment and ownership — from the Nexora team.",
  image: "/images/properties/aerial-neighbourhood.jpg",
  imageAlt: "Aerial view of a residential neighbourhood",
};
