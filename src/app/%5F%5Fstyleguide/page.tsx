import type { Metadata } from "next";
import Image from "next/image";
import { Heading, Text } from "@/components/ui/typography";
import { Reveal, RevealGroup, RevealItem, CountUp, Parallax } from "@/components/motion";
import { ComponentsShowcase } from "./components-showcase";

export const metadata: Metadata = {
  title: "Style Guide",
  robots: { index: false, follow: false },
};

/** Hidden fidelity-check route (removed / guarded before production in Batch 12). */

const palette = [
  { token: "--background", hex: "#F5F5F5", usage: "Page & card surfaces", className: "bg-background", text: "text-foreground" },
  { token: "--foreground", hex: "#232220", usage: "Primary text, icons (darkest)", className: "bg-foreground", text: "text-background" },
  { token: "--muted", hex: "#565655", usage: "Secondary text, metadata", className: "bg-muted", text: "text-background" },
  { token: "--primary", hex: "#E08A20", usage: "CTAs, active, links", className: "bg-primary", text: "text-primary-foreground" },
  { token: "--accent", hex: "#4A4844", usage: "Hover / pressed, emphasis", className: "bg-accent", text: "text-accent-foreground" },
  { token: "--border", hex: "#D4D4D3", usage: "Dividers, input & card outlines", className: "bg-border", text: "text-foreground" },
];

const typeScale = [
  { label: "Hero · Cinzel · clamp(48–64)", node: <p className="font-heading text-hero font-medium tracking-[-0.01em]">Managing Properties</p> },
  { label: "H1 · Cinzel · 36 / 600", node: <Heading as="h1" size="h1">Maximizing Value</Heading> },
  { label: "H2 · Cinzel · 28 / 600", node: <Heading as="h2" size="h2">Institutional Trust</Heading> },
  { label: "H3 · Cinzel · 22 / 600", node: <Heading as="h3" size="h3">Rental & Property Management</Heading> },
  { label: "Body · Montserrat · 16 / 400", node: <Text variant="body">Nexora manages residential, commercial and institutional properties with international-grade governance and transparent monthly reporting.</Text> },
  { label: "Caption · Montserrat · 13 · tracked", node: <Text variant="caption">Kampala, Uganda · A Groupe M-Zi Inc. Company</Text> },
];

export default function StyleGuidePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <header className="mb-16 border-b border-border pb-8">
        <Text variant="caption" className="mb-3">Nexora Design System</Text>
        <Heading as="h1" size="hero">Style Guide</Heading>
        <Text variant="muted" className="mt-4 max-w-2xl">
          Fidelity reference for the locked tokens, type scale and motion primitives.
          Hidden route — not linked, not indexed.
        </Text>
      </header>

      {/* Palette --------------------------------------------------------- */}
      <section className="mb-20">
        <Heading as="h2" size="h2" className="mb-6">Colour palette</Heading>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {palette.map((c) => (
            <div key={c.token} className="overflow-hidden rounded-md border border-border">
              <div className={`flex h-24 items-end p-3 ${c.className}`}>
                <span className={`font-sans text-caption ${c.text}`}>{c.hex}</span>
              </div>
              <div className="bg-background p-3">
                <code className="font-sans text-sm text-foreground">{c.token}</code>
                <Text variant="muted" className="mt-1 text-caption">{c.usage}</Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Type scale ------------------------------------------------------ */}
      <section className="mb-20">
        <Heading as="h2" size="h2" className="mb-6">Type scale</Heading>
        <div className="space-y-8">
          {typeScale.map((t) => (
            <div key={t.label} className="border-b border-border pb-6">
              <Text variant="caption" className="mb-2">{t.label}</Text>
              {t.node}
            </div>
          ))}
        </div>
      </section>

      {/* Motion: Reveal -------------------------------------------------- */}
      <section className="mb-20">
        <Heading as="h2" size="h2" className="mb-6">Motion · Reveal (fade-up on scroll)</Heading>
        <Reveal className="rounded-md border border-border bg-background p-8">
          <Text variant="body">
            This block fades up and translates into view once, then stays. Under
            <code className="mx-1 text-primary">prefers-reduced-motion</code>it renders instantly.
          </Text>
        </Reveal>
      </section>

      {/* Motion: staggered grid ------------------------------------------ */}
      <section className="mb-20">
        <Heading as="h2" size="h2" className="mb-6">Motion · RevealGroup (staggered grid)</Heading>
        <RevealGroup stagger={0.12} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Transparency", "Governance", "Value"].map((label) => (
            <RevealItem key={label} className="rounded-md border border-border bg-background p-6">
              <Heading as="h3" size="h3">{label}</Heading>
              <Text variant="muted" className="mt-2">Staggered children reveal in sequence.</Text>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Motion: CountUp ------------------------------------------------- */}
      <section className="mb-20">
        <Heading as="h2" size="h2" className="mb-6">Motion · CountUp (0 → n in view)</Heading>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { to: 1200, suffix: "+", label: "Units managed" },
            { to: 98, suffix: "%", label: "Occupancy" },
            { to: 12, suffix: "", label: "Years" },
            { to: 96, suffix: "%", label: "Satisfaction" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-background p-6 text-center">
              <div className="font-heading text-h1 font-semibold text-primary">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <Text variant="caption" className="mt-2">{s.label}</Text>
            </div>
          ))}
        </div>
      </section>

      {/* Motion: Parallax ------------------------------------------------ */}
      <section className="mb-8">
        <Heading as="h2" size="h2" className="mb-6">Motion · Parallax (subtle scroll)</Heading>
        <Parallax className="rounded-md border border-border" offset={50}>
          <div className="relative aspect-[16/9] w-full">
            <Image
              src="/images/properties/villas-dusk.jpg"
              alt="Luxury Nexora-managed villas at dusk"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="scale-110 object-cover"
              priority
            />
          </div>
        </Parallax>
      </section>

      {/* Component library (Batch 2) ------------------------------------- */}
      <div className="mt-24 border-t border-border pt-16">
        <Text variant="caption" className="mb-3">Batch 2</Text>
        <Heading as="h1" size="h1" className="mb-10">Component library</Heading>
        <ComponentsShowcase />
      </div>
    </main>
  );
}
