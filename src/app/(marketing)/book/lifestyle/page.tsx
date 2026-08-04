import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PageHero } from "@/components/marketing/page-hero";
import { ServiceBookingWizard, type WizardConfig } from "@/components/marketing/service-booking-wizard";

export const metadata: Metadata = pageMeta({
  title: "Book a Lifestyle Service",
  description:
    "Book Nexora home & lifestyle services — laundry with pickup & delivery, mobile car wash, gardening & lawn care and janitorial services across Kampala.",
  path: "/book/lifestyle",
  ogImage: "/images/og/nexora-og-default.jpg",
});

const config: WizardConfig = {
  kind: "lifestyle",
  detailsTitle: "Service details",
  propertyFields: false,
  categories: [
    { label: "Laundry", icon: "sparkles", blurb: "Wash, dry-clean, fold & iron — pickup & delivery.", detailsHint: "Roughly how many items or kilograms? Any dry-clean-only pieces?" },
    { label: "Mobile Car Wash", icon: "vehicle", blurb: "Private or fleet, interior & exterior, at your bay.", detailsHint: "Vehicle type and count — e.g. 1 SUV, interior + exterior." },
    { label: "Gardening & Lawn", icon: "home", blurb: "Landscaping and grounds kept sharp.", detailsHint: "Approximate garden/lawn size and what needs doing." },
    { label: "Janitorial", icon: "cog", blurb: "Ongoing janitorial care for homes and workspaces.", detailsHint: "The space, frequency you have in mind, and any specifics." },
  ],
};

export default function BookLifestylePage() {
  return (
    <>
      <PageHero
        eyebrow="Home & Lifestyle"
        title="Everyday services, booked in minutes"
        subtitle="Laundry, car wash, gardening and janitorial care — professional teams, scheduled around you."
        image="/images/properties/villa-garden-pool.jpg"
        imageAlt="Villa garden and pool kept immaculate"
      />
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <ServiceBookingWizard config={config} />
      </section>
    </>
  );
}
