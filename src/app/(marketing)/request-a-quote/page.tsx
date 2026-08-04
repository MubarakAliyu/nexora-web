import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PageHero } from "@/components/marketing/page-hero";
import { QuoteScheduler } from "@/components/marketing/quote-scheduler";

export const metadata: Metadata = pageMeta({
  title: "Request a Quote",
  description:
    "Book a free 30-minute consultation with a Nexora advisor. Pick a date and time that suits you and we'll prepare a tailored property-management proposal.",
  path: "/request-a-quote",
  ogImage: "/images/og/nexora-og-default.jpg",
});

export default function RequestQuotePage() {
  return (
    <>
      <PageHero
        eyebrow="Request a Quote"
        title="Book your free consultation."
        subtitle="Choose a time that works for you. In 30 minutes we'll understand your property, your goals, and prepare a tailored proposal — no obligation."
        image="/images/properties/villa-infinity-pool.jpg"
        imageAlt="Modern villa with infinity pool"
      />

      <section className="bg-surface-hover/40 px-6 py-20 md:px-10 md:py-24">
        <QuoteScheduler />
      </section>
    </>
  );
}
