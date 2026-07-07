import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, ArrowRight } from "flowbite-react-icons/outline";
import { Reveal, RevealGroup, RevealItem, CountUp } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { PropertyGallery } from "@/components/marketing/property-gallery";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { SectionIcon } from "@/components/marketing/section-icons";
import { properties, propertySlugs, getProperty } from "@/content/portfolio";

export function generateStaticParams() {
  return propertySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) return { title: "Property not found" };
  return { title: property.name, description: property.excerpt };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();

  const related = property.related
    .map((s) => getProperty(s))
    .filter((p): p is (typeof properties)[number] => Boolean(p));

  return (
    <>
      <PageHero
        eyebrow={property.category}
        title={property.name}
        subtitle={`${property.location} · ${property.units} units · ${property.occupancy}% occupancy`}
        image={property.image}
        imageAlt={property.name}
      />

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <PropertyGallery images={property.gallery} alt={property.name} />
      </section>

      {/* Details + scope */}
      <section className="bg-surface-hover">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:px-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                Property details
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-heading text-h1 font-semibold text-foreground">
                About this property
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-4 text-body leading-relaxed text-muted">{property.excerpt}</p>
            </Reveal>
            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
              {property.details.map((d, i) => (
                <Reveal key={d.label} delay={0.2 + i * 0.06}>
                  <div className="border-t border-border pt-3">
                    <dt className="text-caption uppercase tracking-wide text-muted">
                      {d.label}
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{d.value}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          <div>
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                Scope of management
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="font-heading text-h1 font-semibold text-foreground">
                What Nexora manages
              </h2>
            </Reveal>
            <RevealGroup stagger={0.08} className="mt-6 space-y-3">
              {property.scope.map((s) => (
                <RevealItem key={s.text}>
                  <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
                      <SectionIcon name={s.icon} size={20} />
                    </span>
                    <span className="text-body text-foreground">{s.text}</span>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <Reveal>
          <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
            Results achieved
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
            Measurable impact
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {property.results.map((r, i) => (
            <Reveal key={r.label} delay={i * 0.08}>
              <div className="rounded-xl border border-border bg-background p-8 text-center">
                <div className="font-heading text-hero font-medium text-primary">
                  <CountUp to={r.value} prefix={r.prefix} suffix={r.suffix} />
                </div>
                <p className="mt-2 text-caption uppercase tracking-wide text-muted">
                  {r.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Related properties */}
      {related.length > 0 && (
        <section className="bg-surface-hover">
          <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
            <Reveal>
              <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                More from our portfolio
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
                Related properties
              </h2>
            </Reveal>
            <RevealGroup
              stagger={0.08}
              className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((r) => (
                <RevealItem key={r.slug} className="h-full">
                  <Link
                    href={`/portfolio/${r.slug}`}
                    className="group block h-full overflow-hidden rounded-xl border border-border bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={r.image}
                        alt={r.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground">
                        {r.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading text-h3 font-semibold text-foreground">
                        {r.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                        <MapPin size={14} />
                        {r.location}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary transition-colors group-hover:text-accent">
                        View property
                        <ArrowRight
                          size={16}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      <CtaBanner
        heading={`Want results like ${property.name}?`}
        subline="Let Nexora manage your property with the same transparency and care. Start with a free assessment."
        image={property.image}
        imageAlt={property.name}
        primary={{ label: "Request a Free Assessment", href: "/contact" }}
        secondary={{ label: "Back to portfolio", href: "/portfolio" }}
      />
    </>
  );
}
