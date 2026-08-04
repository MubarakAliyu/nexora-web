import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MediaText } from "@/components/marketing/media-text";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SectionIcon } from "@/components/marketing/section-icons";
import { Accordion, AccordionItem } from "@/components/marketing/accordion";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { InvestorForm } from "@/components/forms/investor-form";
import {
  investorsHero,
  whyInvest,
  transparency,
  assetProtection,
  rentalIncome,
  investorFaqs,
  investorsCta,
} from "@/content/investors";

export const metadata: Metadata = pageMeta({
  title: "Investors",
  description:
    "Diaspora and international investors trust Nexora for transparent reporting, protected assets and hands-off rental income across Uganda.",
  path: "/investors",
  ogImage: "/images/og/nexora-og-investors.jpg",
});

export default function InvestorsPage() {
  return (
    <>
      <PageHero {...investorsHero} />

      {/* Why invest — light hover cards */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <SectionHeading
          eyebrow="Why Nexora"
          title="Why investors choose Nexora"
          align="center"
        />
        <RevealGroup stagger={0.07} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {whyInvest.map((v) => (
            <RevealItem key={v.title} className="h-full">
              <div className="group h-full rounded-lg border border-border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <SectionIcon name={v.icon} size={22} />
                </span>
                <h3 className="font-heading text-h3 font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-body text-muted">{v.blurb}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Transparency / asset protection / rental income — alternating */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl space-y-24 px-6 py-24 md:px-10">
          {[transparency, assetProtection, rentalIncome].map((block, i) => (
            <MediaText
              key={block.heading}
              image={block.image}
              imageAlt={block.imageAlt}
              reverse={i % 2 === 1}
              aspect="landscape"
            >
              <Reveal>
                <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                  {block.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="font-heading text-h1 font-semibold text-foreground">
                  {block.heading}
                </h2>
              </Reveal>
              {block.body.map((para, j) => (
                <Reveal key={j} delay={0.16 + j * 0.08}>
                  <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
                </Reveal>
              ))}
            </MediaText>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24 md:px-10">
        <SectionHeading eyebrow="FAQ" title="Investor questions, answered" />
        <Reveal delay={0.12}>
          <Accordion className="mt-10">
            {investorFaqs.map((f) => (
              <AccordionItem key={f.q} title={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* Consultation form */}
      <section id="consultation" className="scroll-mt-24 bg-surface-hover">
        <div className="mx-auto max-w-3xl px-6 py-24 md:px-10">
          <SectionHeading
            eyebrow="Get started"
            title="Book an investor consultation"
            subtitle="Tell us about your property and goals — an advisor will be in touch."
            align="center"
          />
          <Reveal delay={0.12}>
            <div className="mt-10 rounded-2xl border border-border bg-background p-6 shadow-xl md:p-8">
              <InvestorForm />
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner
        heading={investorsCta.heading}
        subline={investorsCta.subline}
        image={investorsCta.image}
        imageAlt={investorsCta.imageAlt}
        primary={investorsCta.primary}
      />
    </>
  );
}
