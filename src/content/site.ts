/**
 * Editable site-wide content: brand, navigation, contact, social, footer.
 * Components must read from here — nothing hardcoded in the chrome.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export type SocialPlatform =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "youtube";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

/* ------------------------------------------------------------- contact */

export const contact = {
  address: "Kampala, Uganda",
  email: "hello@nexora.co.ug", // placeholder — easy to swap
  phone: "+256 700 000 000", // placeholder
  /** Digits only, for wa.me links. Placeholder Nexora WhatsApp Business number. */
  whatsapp: "256700000000",
  whatsappDisplay: "+256 700 000 000",
} as const;

/** Prefilled WhatsApp deep link. */
export const whatsappHref = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
  "Hello Nexora, I'd like to know more about your property management services.",
)}`;

/* ------------------------------------------------------- primary nav */

export const primaryNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Investors", href: "/investors" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/* ------------------------------------------------------ service lines */

export const services: NavLink[] = [
  { label: "Property Management", href: "/services/property-management" },
  { label: "Rental Management", href: "/services/rental-management" },
  { label: "Condominium Management", href: "/services/condominium-management" },
  { label: "Housekeeping & Cleaning", href: "/services/housekeeping-cleaning" },
  { label: "Home & Lifestyle", href: "/services/home-lifestyle" },
  { label: "Asset Optimization", href: "/services/asset-optimization" },
];

/* --------------------------------------------------------- footer nav */

export const footerColumns: FooterColumn[] = [
  {
    title: "Navigation",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Investors", href: "/investors" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: services.slice(0, 6),
  },
  {
    title: "Projects",
    links: [
      { label: "Our Portfolio", href: "/portfolio" },
      { label: "Transformations", href: "/projects" },
      { label: "Blog & Insights", href: "/blog" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "Careers", href: "/careers" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "FAQ", href: "/investors#faq" },
    ],
  },
];

/* ------------------------------------------------------------- social */

export const socials: SocialLink[] = [
  { platform: "whatsapp", label: "WhatsApp", href: whatsappHref },
  { platform: "facebook", label: "Facebook", href: "https://facebook.com" },
  { platform: "instagram", label: "Instagram", href: "https://instagram.com" },
  { platform: "linkedin", label: "LinkedIn", href: "https://linkedin.com" },
  { platform: "twitter", label: "X / Twitter", href: "https://twitter.com" },
];

/* -------------------------------------------------------------- brand */

export const site = {
  name: "Nexora Property Management",
  shortName: "Nexora",
  tagline: "Managing Properties. Maximizing Value.",
  quote:
    "Every property is a promise — to protect value, to serve people, and to endure.",
} as const;

/* ------------------------------------------------- header hero routing */

/**
 * Routes whose page opens with a full-bleed hero, so the header starts
 * transparent (white logo/text over the hero) and only goes solid on scroll.
 * Every other route gets a solid header from the top. Centralised here so
 * adding a hero page is a one-line change and the header stays SSR-stable
 * (no flash), driven by `usePathname()`.
 */
export const heroRoutes: string[] = ["/"];

export function pageHasHero(pathname: string): boolean {
  return heroRoutes.includes(pathname);
}
