import { RevealGroup, RevealItem } from "@/components/motion";
import { SectionHeading } from "./section-heading";
import { SectionIcon } from "./section-icons";
import { whyChoose } from "@/content/home";

/** Why Choose Nexora — 6 value props, staggered fade-up. */
export function HomeWhy() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
      <SectionHeading
        eyebrow="Why Nexora"
        title="Why owners and residents choose us"
        align="center"
      />
      <RevealGroup
        stagger={0.08}
        className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {whyChoose.map((v) => (
          <RevealItem key={v.title} className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-active text-primary">
              <SectionIcon name={v.icon} size={22} />
            </span>
            <div>
              <h3 className="font-heading text-h3 font-semibold text-foreground">
                {v.title}
              </h3>
              <p className="mt-1.5 text-body text-muted">{v.blurb}</p>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
