import type { Metadata } from "next";
import { CheckCircle } from "flowbite-react-icons/outline";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHero } from "@/components/marketing/page-hero";
import { MediaText } from "@/components/marketing/media-text";
import {
  ImageOverlaySection,
  GlassPanel,
} from "@/components/marketing/section-treatments";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { SectionIcon } from "@/components/marketing/section-icons";
import { cn } from "@/lib/utils";
import {
  aboutHero,
  aboutStory,
  visionMission,
  coreValues,
  leadership,
  roadmap,
  aboutCta,
} from "@/content/about";

export const metadata: Metadata = {
  title: "About",
  description:
    "Nexora is a Kampala-based property management company backed by the international governance of Groupe M-Zi Inc. — combining local excellence with global standards.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero {...aboutHero} />

      {/* Company story — image left, narrative right */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <MediaText image={aboutStory.image} imageAlt={aboutStory.imageAlt} aspect="landscape">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              {aboutStory.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-heading text-h1 font-semibold text-foreground">
              {aboutStory.heading}
            </h2>
          </Reveal>
          {aboutStory.body.map((para, i) => (
            <Reveal key={i} delay={0.16 + i * 0.08}>
              <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
            </Reveal>
          ))}
        </MediaText>
      </section>

      {/* Vision & Mission — pull statement + frosted glass panels over imagery */}
      <ImageOverlaySection
        image={visionMission.image}
        imageAlt={visionMission.imageAlt}
        scrim="bg-foreground/80"
      >
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
          <Reveal>
            <GlassPanel
              tone="dark"
              className="mx-auto max-w-3xl p-8 text-center md:p-10"
            >
              <p className="font-heading text-h2 font-medium italic leading-snug text-background md:text-[2.2rem] md:leading-[1.25]">
                “{visionMission.pullStatement}”
              </p>
            </GlassPanel>
          </Reveal>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <Reveal>
              <GlassPanel tone="dark" className="border-l-2 border-l-primary p-8">
                <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">
                  {visionMission.vision.label}
                </p>
                <p className="mt-3 font-heading text-h3 font-medium leading-snug text-background">
                  {visionMission.vision.text}
                </p>
              </GlassPanel>
            </Reveal>
            <Reveal delay={0.1}>
              <GlassPanel tone="dark" className="border-l-2 border-l-primary p-8 md:mt-12">
                <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">
                  {visionMission.mission.label}
                </p>
                <p className="mt-3 font-heading text-h3 font-medium leading-snug text-background">
                  {visionMission.mission.text}
                </p>
              </GlassPanel>
            </Reveal>
          </div>
        </div>
      </ImageOverlaySection>

      {/* Core values */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <Reveal>
          <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
            What we stand for
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
            Our core values
          </h2>
        </Reveal>
        <RevealGroup stagger={0.08} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {coreValues.map((v) => (
            <RevealItem key={v.title} className="h-full">
              <div className="group h-full rounded-lg border border-border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <SectionIcon name={v.icon} size={22} />
                </span>
                <h3 className="font-heading text-h3 font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-body text-muted">{v.blurb}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Leadership */}
      <section className="bg-surface-hover">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              Our people
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
              Leadership team
            </h2>
          </Reveal>
          <RevealGroup stagger={0.08} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((leader) => (
              <RevealItem key={leader.name} className="h-full">
                <div className="group h-full rounded-lg border border-border bg-background p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-active font-heading text-h3 font-semibold text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    {leader.initials}
                  </span>
                  <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">
                    {leader.name}
                  </h3>
                  <p className="mt-1 text-caption font-medium uppercase tracking-wide text-primary">
                    {leader.role}
                  </p>
                  <p className="mt-3 text-body text-muted">{leader.bio}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Growth roadmap */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <Reveal>
          <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
            Where we’re headed
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="max-w-2xl font-heading text-h1 font-semibold text-foreground">
            Our growth roadmap
          </h2>
        </Reveal>
        <RevealGroup stagger={0.12} className="mt-12 grid gap-6 md:grid-cols-3">
          {roadmap.map((p, i) => (
            <RevealItem key={p.phase} className="h-full">
              <div
                className={cn(
                  "h-full rounded-lg border p-6 transition-colors",
                  i === 0 ? "border-primary bg-surface-hover" : "border-border bg-background",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-sans text-caption font-semibold tabular-nums",
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-active text-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-caption font-medium uppercase tracking-wide text-muted">
                    {p.period}
                  </span>
                </div>
                <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">
                  {p.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2 text-body text-muted">
                      <CheckCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <CtaBanner
        heading={aboutCta.heading}
        subline={aboutCta.subline}
        image={aboutCta.image}
        imageAlt={aboutCta.imageAlt}
        primary={aboutCta.primary}
      />
    </>
  );
}
