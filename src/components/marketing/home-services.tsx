import { RevealGroup, RevealItem } from "@/components/motion";
import { SectionHeading } from "./section-heading";
import { SectionIcon } from "./section-icons";
import { AnimatedLink } from "./animated-link";
import { services } from "@/content/home";

/** Services overview — staggered card reveal, hover lift + icon accent. */
export function HomeServices() {
  return (
    <section className="bg-surface-hover">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <SectionHeading
          eyebrow="What we do"
          title="Comprehensive property services"
          subtitle="One accountable partner for every aspect of managing and maximizing your property."
        />
        <RevealGroup
          stagger={0.08}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((s) => (
            <RevealItem key={s.slug} className="h-full">
              <div className="group flex h-full flex-col rounded-lg border border-border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-surface-active text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <SectionIcon name={s.icon} size={24} />
                </span>
                <h3 className="font-heading text-h3 font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-body text-muted">{s.blurb}</p>
                <div className="mt-4">
                  <AnimatedLink href={`/services/${s.slug}`}>Learn more</AnimatedLink>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="mt-12 flex justify-center">
          <AnimatedLink href="/services">View All Services</AnimatedLink>
        </div>
      </div>
    </section>
  );
}
