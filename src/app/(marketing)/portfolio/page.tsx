import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { PortfolioGrid } from "@/components/marketing/portfolio-grid";
import { ParallaxFeature } from "@/components/marketing/parallax-feature";
import { StatCardsSection } from "@/components/marketing/section-treatments";
import { CtaBanner } from "@/components/marketing/cta-banner";
import {
  portfolioHero,
  portfolioFeature,
  portfolioStats,
  portfolioCta,
} from "@/content/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Explore the residential towers, condominiums, commercial plazas and managed facilities under Nexora Property Management.",
};

export default function PortfolioPage() {
  return (
    <>
      <PageHero {...portfolioHero} />

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <PortfolioGrid />
      </section>

      <ParallaxFeature
        quote={portfolioFeature.quote}
        image={portfolioFeature.image}
        imageAlt={portfolioFeature.imageAlt}
      />

      {/* Impact strip — light hover-animated stat cards */}
      <StatCardsSection stats={portfolioStats} />

      <CtaBanner {...portfolioCta} />
    </>
  );
}
