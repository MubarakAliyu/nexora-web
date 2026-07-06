import Image from "next/image";
import { Heading, Text } from "@/components/ui/typography";
import { Reveal } from "@/components/motion";

/**
 * TEMPORARY homepage — a full-bleed hero + long scroll content, so the header's
 * transparent→solid transition can be tested. Replaced by the real Ilios-modelled
 * homepage in Batch 4.
 */
export default function Home() {
  return (
    <>
      {/* Full-bleed hero (header overlays this transparently) */}
      <section className="relative flex h-screen min-h-[620px] items-center justify-center overflow-hidden">
        <Image
          src="/images/properties/villas-dusk.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-foreground/55" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <Text variant="caption" className="mb-4 text-background/80">
            Nexora Property Management
          </Text>
          <h1 className="font-heading text-hero font-medium tracking-[-0.01em] text-background">
            Managing Properties. Maximizing Value.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-body text-background/85">
            Premium property, rental and facility management with international-grade
            governance — trusted across Uganda and beyond.
          </p>
        </div>
      </section>

      {/* Long scroll content to exercise the sticky header */}
      <div className="mx-auto max-w-5xl space-y-16 px-6 py-24">
        {[
          "Institutional trust",
          "Transparent reporting",
          "Full-service management",
          "Diaspora & investor focus",
          "Facilities & maintenance",
          "Premium care",
        ].map((title, i) => (
          <Reveal key={title} delay={i * 0.05}>
            <section className="space-y-4">
              <Heading as="h2" size="h2">
                {title}
              </Heading>
              <Text variant="muted" className="max-w-3xl">
                Placeholder content block to provide scroll height so the header
                transition can be observed. The real sections (hero slider, trust bar,
                services, tabbed showcase, testimonials, CTA) are built in Batch 4.
              </Text>
              <div className="h-40 rounded-lg border border-border bg-surface-hover" />
            </section>
          </Reveal>
        ))}
      </div>
    </>
  );
}
