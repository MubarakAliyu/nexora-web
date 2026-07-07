import type { Metadata } from "next";
import { Reveal, CountUp } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { PortfolioGrid } from "@/components/marketing/portfolio-grid";
import { ParallaxFeature } from "@/components/marketing/parallax-feature";
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

      {/* Impact strip — elevated floating stat cards */}
      <section className="bg-gradient-to-b from-background to-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {portfolioStats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="rounded-2xl border border-border bg-background p-8 text-center shadow-lg transition-transform duration-300 hover:-translate-y-1">
                  <div className="font-heading text-hero font-medium text-primary">
                    <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <p className="mx-auto mt-2 max-w-[12rem] text-caption uppercase tracking-wide text-muted">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner {...portfolioCta} />
    </>
  );
}
