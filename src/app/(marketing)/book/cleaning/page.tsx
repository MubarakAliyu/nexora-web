import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { ServiceBookingWizard, type WizardConfig } from "@/components/marketing/service-booking-wizard";

export const metadata: Metadata = {
  title: "Book Cleaning",
  description:
    "Book professional cleaning with Nexora — residential, commercial, deep, move-in/out, event, facility and scheduled cleaning programmes across Kampala.",
};

const config: WizardConfig = {
  kind: "cleaning",
  detailsTitle: "Property details",
  propertyFields: true,
  categories: [
    { label: "Residential Cleaning", icon: "home", blurb: "Homes and serviced apartments, spotless." },
    { label: "Commercial Cleaning", icon: "building", blurb: "Offices, retail and workspaces." },
    { label: "Deep Cleaning", icon: "sparkles", blurb: "Kitchen, bathroom, carpet, mattress, upholstery." },
    { label: "Move-In/Move-Out", icon: "tools", blurb: "Turnover cleaning that gets units ready." },
    { label: "Event Cleaning", icon: "award", blurb: "Pre- and post-event venue cleaning." },
    { label: "Facility Cleaning", icon: "cog", blurb: "Common areas and building facilities." },
    { label: "Scheduled Programme", icon: "chart", blurb: "Daily, weekly, monthly or contract plans." },
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
