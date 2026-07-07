import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle } from "flowbite-react-icons/outline";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MediaText } from "@/components/marketing/media-text";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { SectionIcon } from "@/components/marketing/section-icons";
import { CtaButton } from "@/components/marketing/cta-button";
import { services, serviceSlugs, getService } from "@/content/services";

export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };
  return {
    title: service.title,
    description: service.promise,
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = service.related
    .map((s) => getService(s))
    .filter((s): s is (typeof services)[number] => Boolean(s));

  return (
    <>
      <PageHero
        eyebrow="Service"
        title={service.title}
        subtitle={service.promise}
        image={service.heroImage}
        imageAlt={service.title}
      />

      {/* Overview — image left, copy right */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <MediaText image={service.overviewImage} imageAlt={service.title}>
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              Overview
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-heading text-h1 font-semibold text-foreground">
              The Nexora approach
            </h2>
          </Reveal>
          {service.overview.map((para, i) => (
            <Reveal key={i} delay={0.16 + i * 0.08}>
              <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
            </Reveal>
          ))}
        </MediaText>
      </section>

      {/* What's included */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              What’s included
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
              Everything this service covers
            </h2>
          </Reveal>
          <RevealGroup stagger={0.08} className="mt-12 grid gap-5 sm:grid-cols-2">
            {service.included.map((item) => (
              <RevealItem key={item.title} className="h-full">
                <div className="group flex h-full gap-4 rounded-lg border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <SectionIcon name={item.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="font-heading text-h3 font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-body text-muted">{item.desc}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Who it's for + pricing model */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                Who it’s for
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-heading text-h2 font-semibold text-foreground">
                Built for owners like you
              </h2>
            </Reveal>
            <ul className="mt-6 space-y-3">
              {service.forWho.map((who, i) => (
                <Reveal key={who} delay={0.12 + i * 0.06}>
                  <li className="flex gap-3 text-body text-foreground">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-primary" />
                    <span>{who}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delay={0.1}>
            <div className="rounded-xl border-l-2 border-primary bg-surface-hover p-8">
              <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">
                Pricing model
              </p>
              <p className="mt-4 font-heading text-h3 font-medium leading-snug text-foreground">
                {service.pricingNote}
              </p>
              <div className="mt-6">
                <CtaButton href="/contact" size="md">
                  Request a Quote
                </CtaButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="bg-surface-hover">
          <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                Explore more
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
                Related services
              </h2>
            </Reveal>
            <RevealGroup
              stagger={0.08}
              className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((r) => (
                <RevealItem key={r.slug} className="h-full">
                  <Link
                    href={`/services/${r.slug}`}
                    className="group block h-full rounded-lg border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                  >
                    <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <SectionIcon name={r.icon} size={24} />
                    </span>
                    <h3 className="font-heading text-h3 font-semibold text-foreground">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-body text-muted">{r.excerpt}</p>
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
          </div>
        </section>
      )}

      <CtaBanner
        heading={`Ready to get started with ${service.title}?`}
        subline="Tell us about your property and we’ll tailor the right solution — with a free, no-obligation assessment."
        image={service.heroImage}
        imageAlt={service.title}
        primary={{ label: "Request a Free Assessment", href: "/contact" }}
        secondary={{ label: "See all services", href: "/services" }}
      />
    </>
  );
}
