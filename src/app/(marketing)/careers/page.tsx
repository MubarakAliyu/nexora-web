import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MediaText } from "@/components/marketing/media-text";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SectionIcon } from "@/components/marketing/section-icons";
import { CareersApply } from "@/components/marketing/careers-apply";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { careersHero, culture, benefits, careersCta } from "@/content/careers";

export const metadata: Metadata = pageMeta({
  title: "Careers",
  description:
    "Join Nexora — build the future of property management with a team that combines local excellence and global standards.",
  path: "/careers",
  ogImage: "/images/og/nexora-og-default.jpg",
});

export default function CareersPage() {
  return (
    <>
      <PageHero {...careersHero} />

      {/* Positions + application */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <CareersApply />
      </section>

      {/* Culture */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <MediaText
            image={culture.image}
            imageAlt={culture.imageAlt}
            reverse
            aspect="landscape"
          >
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                {culture.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-heading text-h1 font-semibold text-foreground">
                {culture.heading}
              </h2>
            </Reveal>
            {culture.body.map((para, i) => (
              <Reveal key={i} delay={0.16 + i * 0.08}>
                <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
              </Reveal>
            ))}
          </MediaText>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <SectionHeading eyebrow="Why join" title="Benefits & perks" align="center" />
        <RevealGroup stagger={0.07} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <RevealItem key={b.title} className="h-full">
              <div className="group h-full rounded-lg border border-border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <SectionIcon name={b.icon} size={22} />
                </span>
                <h3 className="font-heading text-h3 font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-body text-muted">{b.blurb}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <CtaBanner
        heading={careersCta.heading}
        subline={careersCta.subline}
        image={careersCta.image}
        imageAlt={careersCta.imageAlt}
        primary={careersCta.primary}
      />
    </>
  );
}
