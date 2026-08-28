import type { Metadata } from "next";
import { CatalogueBooking } from "@/components/marketing/catalogue-booking";

/**
 * Booking form for ANY admin-configured service type, addressed by its slug.
 *
 * This is what makes the catalogue genuinely data-driven: a service type created
 * in the admin UI today is bookable at /book/<its-slug> immediately, with no route
 * file, no component and no deploy. The page is a thin shell — everything it
 * renders comes from the catalogue at runtime.
 */
export const metadata: Metadata = {
  title: "Book a service",
  description: "Choose what you need, see the price before you commit, and book online.",
};

export default async function CatalogueBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <CatalogueBooking slug={slug} />
      </div>
    </section>
  );
}
