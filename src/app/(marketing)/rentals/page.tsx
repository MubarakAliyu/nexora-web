import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { RentalBrowser } from "@/components/marketing/rental-browser";

export const metadata: Metadata = {
  title: "Rentals",
  description:
    "Browse Nexora's short-term and long-term rentals across Kampala and beyond — serviced apartments, homes and residences. Book a stay instantly or enquire about a long lease.",
};

export default function RentalsPage() {
  return (
    <>
      <PageHero
        eyebrow="Find your next home"
        title="Rentals across Kampala & beyond"
        subtitle="Book a short-term serviced stay instantly, or enquire about a long-term home — all professionally managed by Nexora."
        image="/images/point3d-commercial-imaging-ltd-JbiLJnvj4b8-unsplash.jpg"
        imageAlt="Bright, modern open-plan rental apartment"
      />
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
        <RentalBrowser />
      </section>
    </>
  );
}
