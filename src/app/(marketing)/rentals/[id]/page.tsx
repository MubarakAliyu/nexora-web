"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { MapPin, Home, Bed, CheckCircle, AngleLeft, ArrowRight } from "flowbite-react-icons/outline";
import { Reveal } from "@/components/motion";
import { RentalBookingFlow } from "@/components/marketing/rental-booking-flow";
import { RentalInquiryForm } from "@/components/marketing/rental-inquiry-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/lib/use-async";
import { formatCurrency } from "@/lib/format";
import { getRentalDetail } from "@/lib/api/rentals";

/** A warm supplementary interior shot for the gallery strip. */
const INTERIOR_SHOT = "/images/francesca-tosolini-yYUu4R4Wuwk-unsplash.jpg";

export default function RentalDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error, reload } = useAsync(() => getRentalDetail(params.id), [params.id]);

  // Only show the skeleton on the FIRST load — a background refetch (e.g. the
  // live-revision bump after a booking is created) must not unmount the flow,
  // or the confirmation step would be destroyed mid-completion.
  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-hover" />
        <div className="mt-6 h-80 w-full animate-pulse rounded-2xl bg-surface-hover" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          icon={<Home size={22} />}
          title="Rental not found"
          description={error ?? "This listing couldn’t be loaded."}
          action={<Button variant="outline" onClick={reload}>Try again</Button>}
        />
        <div className="mt-6 text-center">
          <Link href="/rentals" className="text-body font-medium text-primary hover:text-accent">← Back to rentals</Link>
        </div>
      </div>
    );
  }

  const { property, units, bookedRanges } = data;
  const short = property.rentalType === "short-term";
  const bookableUnits = units.filter((u) => u.status === "vacant");
  const flowUnits = bookableUnits.length ? bookableUnits : units;
  const price = short ? property.shortTerm!.daily : Math.round((property.annualRent ?? 0) / 12);
  const period = short ? "night" : "month";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <Link href="/rentals" className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
        <AngleLeft size={16} /> Back to rentals
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-caption font-semibold ${short ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}>
              {short ? "Short-term" : "Long-term"}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-caption font-medium text-muted">{property.category}</span>
          </div>
          <h1 className="mt-3 font-heading text-h1 font-semibold text-foreground">{property.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-body text-muted"><MapPin size={16} /> {property.location}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-hero font-semibold leading-none text-primary">{formatCurrency(price)}</p>
          <p className="text-caption text-muted">per {period}</p>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2 sm:aspect-auto">
          <Image src={property.image} alt={property.name} fill sizes="(max-width:640px) 100vw, 66vw" className="object-cover" priority />
        </div>
        <div className="relative hidden aspect-[16/10] overflow-hidden rounded-xl sm:block">
          <Image src={INTERIOR_SHOT} alt="Interior" fill sizes="33vw" className="object-cover" />
        </div>
        <div className="relative hidden aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-surface-hover sm:flex">
          <Image src="/images/eric-ardito--4VBwVCdnnc-unsplash.jpg" alt="Residential exterior" fill sizes="33vw" className="object-cover" />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
        {/* Left: details */}
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-6 text-body text-foreground">
            <span className="inline-flex items-center gap-2"><Bed size={18} className="text-primary" /> {property.bedrooms > 0 ? `${property.bedrooms} bedrooms` : "Commercial space"}</span>
            <span className="inline-flex items-center gap-2"><Home size={18} className="text-primary" /> {property.availableUnits} available units</span>
            <span className="inline-flex items-center gap-2"><CheckCircle size={18} className="text-primary" /> {short ? `Min stay ${property.minStay} nights` : `Min lease ${property.minStay} months`}</span>
          </div>

          <section className="mt-6">
            <h2 className="font-heading text-h3 font-semibold text-foreground">About this rental</h2>
            <p className="mt-3 text-body leading-relaxed text-muted">
              {property.name} in {property.location} is professionally managed by Nexora.
              {short
                ? " Book a fully-serviced short-term stay with instant confirmation and secure online payment."
                : " Enquire about a long-term lease and our team will prepare a tailored quotation within 24 hours."}
            </p>
          </section>

          {property.amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-h3 font-semibold text-foreground">Amenities</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-body text-foreground">
                    <CheckCircle size={16} className="shrink-0 text-primary" /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-heading text-h3 font-semibold text-foreground">Available units</h2>
            {flowUnits.length === 0 ? (
              <p className="mt-3 text-body text-muted">No units are currently listed. Please check back soon.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                {flowUnits.map((u, i) => (
                  <div key={u.id} className={`flex items-center justify-between gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div>
                      <p className="font-medium text-foreground">{u.label} · {u.type}</p>
                      <p className="text-caption text-muted">{u.bedrooms} bed · {u.sizeSqm} m²</p>
                    </div>
                    <span className="rounded-full bg-surface-hover px-2.5 py-1 text-caption font-medium text-muted capitalize">{u.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: booking / inquiry */}
        <div id="book" className="lg:w-[420px]">
          <div className="lg:sticky lg:top-24">
            <Reveal>
              {short ? (
                <RentalBookingFlow property={property} units={flowUnits} bookedRanges={bookedRanges} />
              ) : (
                <RentalInquiryForm property={property} units={flowUnits} />
              )}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
        <Link href="/rentals" className="text-body font-medium text-primary hover:text-accent">← All rentals</Link>
        <Link href="/services/rental-management" className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:text-accent">
          About Rental Management <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
