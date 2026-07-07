import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "flowbite-react-icons/outline";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { SectionIcon } from "@/components/marketing/section-icons";
import {
  services,
  servicesIndexHero,
  processSteps,
  servicesCta,
} from "@/content/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Full-service property management from Nexora — rental, property, condominium and facility management, cleaning, security, maintenance, mobile car wash and asset optimisation.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero {...servicesIndexHero} />

      {/* Services grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <Reveal>
          <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
            What we offer
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
            A complete suite of property services
          </h2>
        </Reveal>
        <RevealGroup stagger={0.07} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <RevealItem key={s.slug} className="h-full">
              <Link
                href={`/services/${s.slug}`}
                className="group block h-full rounded-lg border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <SectionIcon name={s.icon} size={24} />
                </span>
                <h3 className="font-heading text-h3 font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-body text-muted">{s.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-medium text-primary transition-colors group-hover:text-accent">
                  Explore
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Process strip */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              How we work
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="max-w-2xl font-heading text-h1 font-semibold text-background">
              A simple, transparent process
            </h2>
          </Reveal>
          <RevealGroup
            stagger={0.1}
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {processSteps.map((st) => (
              <RevealItem key={st.step}>
                <span className="font-heading text-[3rem] font-medium leading-none text-primary/40">
                  {st.step}
                </span>
                <h3 className="mt-3 font-heading text-h3 font-semibold text-background">
                  {st.title}
                </h3>
                <p className="mt-2 text-body text-background/70">{st.desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <CtaBanner
        heading={servicesCta.heading}
        subline={servicesCta.subline}
        image={servicesCta.image}
        imageAlt={servicesCta.imageAlt}
        primary={servicesCta.primary}
      />
    </>
  );
}
