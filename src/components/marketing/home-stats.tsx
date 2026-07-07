import { Reveal, CountUp } from "@/components/motion";
import { stats } from "@/content/home";

/** Trust bar — animated count-up stats separated by thin --border dividers. */
export function HomeStats() {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <div key={s.label} className="bg-background px-6 py-10 text-center">
            <Reveal delay={i * 0.08}>
              <div className="font-heading text-h1 font-semibold text-primary md:text-[2.75rem]">
                <CountUp to={s.value} suffix={s.suffix} prefix={s.prefix} />
              </div>
              <p className="mx-auto mt-2 max-w-[12rem] text-caption uppercase tracking-wide text-muted">
                {s.label}
              </p>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
