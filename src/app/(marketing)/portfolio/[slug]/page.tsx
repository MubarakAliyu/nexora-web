import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Building,
  Home,
  BadgeCheck,
  Clock,
  Truck,
  AdjustmentsHorizontal,
  MapPin,
  ShieldCheck,
  Phone,
  Envelope,
  ArrowRight,
} from "flowbite-react-icons/outline";
import { Whatsapp } from "flowbite-react-icons/solid";
import { Reveal, RevealGroup, RevealItem, CountUp } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { PropertyGallery } from "@/components/marketing/property-gallery";
import { MapEmbed } from "@/components/marketing/map-embed";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { CtaButton } from "@/components/marketing/cta-button";
import { SectionIcon } from "@/components/marketing/section-icons";
import {
  properties,
  propertySlugs,
  getProperty,
  getPropertyMeta,
} from "@/content/portfolio";
import { contact, whatsappHref } from "@/content/site";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/seo";

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
  const url = `${SITE_URL}/portfolio/${slug}`;
  return {
    title: property.name,
    description: property.excerpt,
    alternates: { canonical: url },
    openGraph: { title: property.name, description: property.excerpt, url, images: [{ url: property.image, width: 1200, height: 630, alt: property.name }] },
    twitter: { card: "summary_large_image", title: property.name, description: property.excerpt, images: [property.image] },
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();

  const meta = getPropertyMeta(slug);
  const related = property.related
    .map((s) => getProperty(s))
    .filter((p): p is (typeof properties)[number] => Boolean(p));

  const statusValue =
    property.details.find((d) => d.label === "Status")?.value ?? "Fully managed";

  const highlights = [
    { Icon: Building, label: "Type", value: property.category },
    { Icon: AdjustmentsHorizontal, label: "Size", value: meta.size },
    { Icon: Home, label: "Units", value: String(property.units) },
    { Icon: BadgeCheck, label: "Status", value: statusValue },
    { Icon: Clock, label: "Year", value: meta.year },
    { Icon: Truck, label: "Parking", value: meta.parking },
  ];

  const localContext = [
    { Icon: MapPin, label: "Neighbourhood", value: property.location },
    { Icon: Building, label: "Nearby", value: "Shops, dining & schools" },
    { Icon: Truck, label: "Connectivity", value: "Main roads & transport" },
    { Icon: ShieldCheck, label: "Security", value: "Gated & patrolled" },
  ];

  const listingSchema = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: property.name,
    description: property.excerpt,
    url: `${SITE_URL}/portfolio/${slug}`,
    image: `${SITE_URL}${property.image}`,
    numberOfAccommodationUnits: property.units,
    address: { "@type": "PostalAddress", addressLocality: property.location, addressCountry: "UG" },
  };

  return (
    <>
      <JsonLd data={listingSchema} />
      <PageHero
        eyebrow={property.category}
        title={property.name}
        subtitle={`${meta.address} · ${property.units} units · ${property.occupancy}% occupancy`}
        image={property.image}
        imageAlt={property.name}
      />

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <PropertyGallery images={property.gallery} alt={property.name} />
      </section>

      {/* Content + sticky enquiry card */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            {/* Main column */}
            <div className="space-y-14 lg:col-span-2">
              {/* Highlights */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">
                    Property highlights
                  </h2>
                </Reveal>
                <RevealGroup
                  stagger={0.06}
                  className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3"
                >
                  {highlights.map(({ Icon, label, value }) => (
                    <RevealItem key={label}>
                      <div className="rounded-xl border border-border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-active text-primary">
                          <Icon size={20} />
                        </span>
                        <p className="mt-3 text-caption uppercase tracking-wide text-muted">
                          {label}
                        </p>
                        <p className="font-medium text-foreground">{value}</p>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>

              {/* Amenities */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">Amenities</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {meta.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border bg-background px-3.5 py-1.5 text-caption font-medium text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </Reveal>
              </div>

              {/* Overview */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">Overview</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <p className="mt-4 text-body leading-relaxed text-muted">{property.excerpt}</p>
                </Reveal>
                <Reveal delay={0.14}>
                  <p className="mt-4 text-body leading-relaxed text-muted">
                    Nexora manages {property.name} end-to-end — from leasing and finance to
                    facilities, maintenance and resident care — with transparent monthly
                    reporting to owners and a single point of accountability.
                  </p>
                </Reveal>
              </div>

              {/* Scope */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">
                    Scope of management
                  </h2>
                </Reveal>
                <RevealGroup stagger={0.06} className="mt-6 grid gap-3 sm:grid-cols-2">
                  {property.scope.map((s) => (
                    <RevealItem key={s.text}>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
                          <SectionIcon name={s.icon} size={18} />
                        </span>
                        <span className="text-body text-foreground">{s.text}</span>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>

              {/* Location map */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">Location</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <div className="mt-6">
                    <MapEmbed lat={meta.lat} lng={meta.lng} label={meta.address} />
                  </div>
                </Reveal>
              </div>

              {/* Local context */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">
                    Local context
                  </h2>
                </Reveal>
                <RevealGroup
                  stagger={0.06}
                  className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
                >
                  {localContext.map(({ Icon, label, value }) => (
                    <RevealItem key={label}>
                      <div className="h-full rounded-xl border border-border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-active text-primary">
                          <Icon size={20} />
                        </span>
                        <p className="mt-3 text-caption uppercase tracking-wide text-muted">
                          {label}
                        </p>
                        <p className="text-body font-medium text-foreground">{value}</p>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>

              {/* Results */}
              <div>
                <Reveal>
                  <h2 className="font-heading text-h2 font-semibold text-foreground">
                    Results achieved
                  </h2>
                </Reveal>
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  {property.results.map((r, i) => (
                    <Reveal key={r.label} delay={i * 0.08}>
                      <div className="rounded-2xl border border-border bg-background p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                        <div className="font-heading text-h1 font-semibold text-primary">
                          <CountUp to={r.value} prefix={r.prefix} suffix={r.suffix} />
                        </div>
                        <p className="mt-2 text-caption uppercase tracking-wide text-muted">
                          {r.label}
                        </p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky light enquiry card */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="rounded-2xl border border-border bg-background p-6 shadow-xl">
                  <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">
                    Enquire
                  </p>
                  <h3 className="mt-2 font-heading text-h3 font-semibold text-foreground">
                    Request a viewing
                  </h3>
                  <p className="mt-1 text-body text-muted">
                    {property.name} · {property.location}
                  </p>
                  <div className="mt-5">
                    <CtaButton href="/contact" className="w-full justify-center">
                      Request a viewing
                    </CtaButton>
                  </div>
                  <div className="mt-5 space-y-3">
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
                        <Phone size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-caption text-muted">Call us</span>
                        <span className="font-medium text-foreground">{contact.phone}</span>
                      </span>
                    </a>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
                        <Whatsapp size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-caption text-muted">WhatsApp</span>
                        <span className="font-medium text-foreground">
                          {contact.whatsappDisplay}
                        </span>
                      </span>
                    </a>
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary">
                        <Envelope size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-caption text-muted">Email</span>
                        <span className="truncate font-medium text-foreground">
                          {contact.email}
                        </span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related properties */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
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
                  className="group block h-full overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
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
