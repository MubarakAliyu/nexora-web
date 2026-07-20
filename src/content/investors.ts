/** Investors page content (typed). */

export const investorsHero = {
  eyebrow: "For Investors",
  title: "Invest with confidence — from anywhere in the world.",
  subtitle:
    "Nexora gives diaspora and international investors complete transparency, protected assets and hands-off rental income across Uganda.",
  image: "/images/properties/villa-infinity-pool.jpg",
  imageAlt: "Modern managed villa with infinity pool",
};

export interface InvestorValue {
  title: string;
  blurb: string;
  icon: string;
}

export const whyInvest: InvestorValue[] = [
  { title: "International Standards", blurb: "Global best-practice governance brings real accountability to your investment.", icon: "globe" },
  { title: "Radical Transparency", blurb: "Real-time visibility and clear monthly statements — see everything, always.", icon: "eye" },
  { title: "Protected Assets", blurb: "Proactive maintenance and diligence that safeguard your property’s value.", icon: "protection" },
  { title: "Reliable Returns", blurb: "Optimised occupancy and pricing to maximise your rental income.", icon: "chart" },
  { title: "Certified Quality", blurb: "Audited, consistent standards across every service we deliver.", icon: "quality" },
  { title: "Dedicated Support", blurb: "A named advisor and a responsive team across time zones.", icon: "support" },
];

export const transparency = {
  eyebrow: "Monthly reporting",
  heading: "See everything, from thousands of miles away.",
  body: [
    "Every month you receive a clear statement — income, expenses, occupancy and net disbursement — with nothing hidden.",
    "For diaspora owners, this transparency is everything: you always know exactly how your asset is performing, without needing to be here.",
  ],
  image: "/images/jakub-zerdzicki-6TIlcP5af08-unsplash.jpg",
  imageAlt: "House keys resting above property performance charts",
};

export const assetProtection = {
  eyebrow: "Asset protection",
  heading: "Your property, diligently protected.",
  body: [
    "Preventive maintenance, trusted vendors and regular inspections keep your property in excellent condition and protect its long-term value.",
    "We treat your asset as if it were our own — because your trust is the foundation of everything we do.",
  ],
  image: "/images/properties/tower-curved-balcony.jpg",
  imageAlt: "Modern apartment tower with curved balconies",
};

export const rentalIncome = {
  eyebrow: "Rental-income management",
  heading: "Hands-off income you can count on.",
  body: [
    "From tenant sourcing and screening to rent collection and renewals, we manage the full income cycle and disburse your net proceeds on a predictable schedule.",
    "You enjoy the returns; we handle the work.",
  ],
  image: "/images/real-estate-purchase-concept-idea.jpg",
  imageAlt: "Property contract with house keys and rental income",
};

export interface Faq {
  q: string;
  a: string;
}

export const investorFaqs: Faq[] = [
  { q: "Can you manage my property while I live abroad?", a: "Absolutely. Most of our investor clients are based overseas. We handle everything on the ground and keep you fully informed with monthly reports and on-demand updates." },
  { q: "How do I receive my rental income?", a: "We collect rent, deduct agreed management fees and transparent expenses, and disburse your net income on a regular schedule to your chosen account." },
  { q: "How transparent is the reporting?", a: "Completely. You receive itemised monthly statements covering income, expenses, occupancy and disbursements — and you can request supporting detail at any time." },
  { q: "What happens if there’s a maintenance issue?", a: "Our maintenance team coordinates vetted technicians and tracks every request from report to resolution, with costs approved transparently before work proceeds." },
  { q: "What fees does Nexora charge?", a: "Fees are typically a percentage of collected rent or a management fee scaled to your property. We’ll propose a clear, all-inclusive structure tailored to you." },
  { q: "How do I get started?", a: "Book a consultation below. We’ll learn about your property and goals, and propose the right management plan — with a free assessment." },
];

export const investorsCta = {
  heading: "Ready to invest with confidence?",
  subline:
    "Book a no-obligation consultation with a Nexora investor advisor and see how effortless ownership can be.",
  primary: { label: "Book a Consultation", href: "#consultation" },
  image: "/images/cta/cta-invest.jpg",
  imageAlt: "Confident investor celebrating outside a modern building",
};
