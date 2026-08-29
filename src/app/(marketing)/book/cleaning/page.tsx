import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PageHero } from "@/components/marketing/page-hero";
import { ServiceBookingWizard, type WizardConfig } from "@/components/marketing/service-booking-wizard";

export const metadata: Metadata = pageMeta({
  title: "Book Cleaning",
  description:
    "Book professional cleaning with Nexora — residential, commercial, deep, move-in/out, event, facility and scheduled cleaning programmes across Kampala.",
  path: "/book/cleaning",
  ogImage: "/images/og/nexora-og-default.jpg",
});

const config: WizardConfig = {
  kind: "cleaning",
  detailsTitle: "Property details",
  propertyFields: true,
  /* F2.0 — every cleaning sub-service is priced from the one "cleaning" catalogue
     type, referenced explicitly by slug. Slugs are stable across renames; display
     names are not, which is why nothing here matches on the label. */
  categories: [
    { label: "Residential Cleaning", icon: "home", blurb: "Homes and serviced apartments, spotless.", serviceTypeRef: "cleaning" },
    { serviceTypeRef: "cleaning", label: "Commercial Cleaning", icon: "building", blurb: "Offices, retail and workspaces." },
    { serviceTypeRef: "cleaning", label: "Deep Cleaning", icon: "sparkles", blurb: "Kitchen, bathroom, carpet, mattress, upholstery." },
    { serviceTypeRef: "cleaning", label: "Move-In/Move-Out", icon: "tools", blurb: "Turnover cleaning that gets units ready." },
    { serviceTypeRef: "cleaning", label: "Event Cleaning", icon: "award", blurb: "Pre- and post-event venue cleaning." },
    { serviceTypeRef: "cleaning", label: "Facility Cleaning", icon: "cog", blurb: "Common areas and building facilities." },
    { serviceTypeRef: "cleaning", label: "Scheduled Programme", icon: "chart", blurb: "Daily, weekly, monthly or contract plans." },
  ],
};

export default function BookCleaningPage() {
  return (
    <>
      <PageHero
        eyebrow="Housekeeping & Cleaning"
        title="Book a cleaning in minutes"
        subtitle="Choose a service, tell us about the space, pick a time — our trained, supervised team handles the rest."
        image="/images/properties/interior-living-room.jpg"
        imageAlt="Immaculate cleaned living room"
      />
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <ServiceBookingWizard config={config} />
      </section>
    </>
  );
}
