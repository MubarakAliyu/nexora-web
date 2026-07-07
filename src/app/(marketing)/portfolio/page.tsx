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

      {/* Impact strip */}
      <section className="border-y border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {portfolioStats.map((s, i) => (
            <div key={s.label} className="bg-background px-6 py-10 text-center">
              <Reveal delay={i * 0.08}>
                <div className="font-heading text-h1 font-semibold text-primary md:text-[2.5rem]">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <p className="mx-auto mt-2 max-w-[12rem] text-caption uppercase tracking-wide text-muted">
                  {s.label}
                </p>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner {...portfolioCta} />
    </>
  );
}
