import type { Metadata } from "next";
import { Reveal, CountUp } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MediaText } from "@/components/marketing/media-text";
import { BeforeAfter } from "@/components/marketing/before-after";
import { SuccessStories } from "@/components/marketing/success-stories";
import { SectionHeading } from "@/components/marketing/section-heading";
import { CtaBanner } from "@/components/marketing/cta-banner";
import {
  projectsHero,
  beforeAfters,
  transformationStories,
  impactMetrics,
  projectsCta,
} from "@/content/portfolio";

export const metadata: Metadata = {
  title: "Projects & Transformations",
  description:
    "See the measurable impact of Nexora management — cleaning and upgrade transformations, occupancy turnarounds and facility success stories.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero {...projectsHero} />

      {/* Before / after */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-10">
        <SectionHeading
          eyebrow="Before & after"
          title="See the transformation"
          subtitle="Drag the handle to compare — the difference professional management and care make."
        />
        <div className="mt-12 space-y-16">
          {beforeAfters.map((ba, i) => (
            <div
              key={ba.title}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <Reveal className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <BeforeAfter
                  before={ba.before}
                  after={ba.after}
                  beforeAlt={ba.beforeAlt}
                  afterAlt={ba.afterAlt}
                />
              </Reveal>
              <div className={i % 2 === 1 ? "lg:order-1" : undefined}>
                <Reveal>
                  <h3 className="font-heading text-h2 font-semibold text-foreground">
                    {ba.title}
                  </h3>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-3 text-body leading-relaxed text-muted">{ba.desc}</p>
                </Reveal>
                <Reveal delay={0.18}>
                  <p className="mt-4 text-caption uppercase tracking-wide text-primary">
                    ← Drag to compare →
                  </p>
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transformation stories — alternating */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl space-y-24 px-6 py-24 md:px-10">
          {transformationStories.map((story, i) => (
            <MediaText
              key={story.heading}
              image={story.image}
              imageAlt={story.imageAlt}
              reverse={i % 2 === 1}
              aspect="landscape"
            >
              <Reveal>
                <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                  {story.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="font-heading text-h1 font-semibold text-foreground">
                  {story.heading}
                </h2>
              </Reveal>
              {story.body.map((para, j) => (
                <Reveal key={j} delay={0.16 + j * 0.08}>
                  <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
                </Reveal>
              ))}
            </MediaText>
          ))}
        </div>
      </section>

      {/* Impact metrics */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <SectionHeading
          eyebrow="By the numbers"
          title="Our measurable impact"
          align="center"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {impactMetrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div className="rounded-xl border border-border bg-background p-8 text-center">
                <div className="font-heading text-hero font-medium text-primary">
                  <CountUp to={m.value} prefix={m.prefix} suffix={m.suffix} />
                </div>
                <p className="mx-auto mt-2 max-w-[12rem] text-caption uppercase tracking-wide text-muted">
                  {m.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Success stories */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <SectionHeading eyebrow="Success stories" title="Proven across the portfolio" />
          <div className="mt-12">
            <SuccessStories />
          </div>
        </div>
      </section>

      <CtaBanner {...projectsCta} />
    </>
  );
}
