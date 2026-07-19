/**
 * Brand constants for generated PDFs. PDF renderers can't use SVG, so the logo
 * is the PNG lockup from /public/brand. Fonts: @react-pdf ships Helvetica built
 * in (no network fetch, so generation never fails on a font load); Cinzel isn't
 * available to PDF renderers and Montserrat would need a self-hosted TTF, so we
 * use Helvetica throughout — swap via Font.register when a TTF is bundled.
 */
export const PDF = {
  colors: {
    primary: "#E08A20",
    text: "#232220",
    muted: "#565655",
    bg: "#F5F5F5",
    border: "#D4D4D3",
    white: "#FFFFFF",
    rowAlt: "#F5F5F5",
    headerBg: "#232220",
  },
  logo: "/brand/logo-primary.png",
  company: {
    name: "Nexora Property Management Ltd",
    address: "Plot 12, Nakasero Road, Kampala, Uganda",
    phone: "+256 700 000 000",
    email: "hello@nexora.co.ug",
    reg: "Reg. No. 80020-1234567 · TIN 1000-2345-67",
    tagline: "Managing Properties. Maximizing Value.",
  },
} as const;
