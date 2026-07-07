import type { ReactNode } from "react";
import Image from "next/image";
import { Reveal, CountUp, Parallax } from "@/components/motion";
import { cn } from "@/lib/utils";

/* ============================================================================
   Reusable section treatments — adds depth beyond flat surfaces. All glass
   tints are alpha of the existing --foreground / --background tokens (no new
   hues). Strong scrims keep text WCAG-AA legible over imagery.
   ========================================================================== */

/** Frosted glass panel. `tone="dark"` = over imagery (light text);
 *  `tone="light"` = frosted-white panel (dark text). */
export function GlassPanel({
  tone = "dark",
  className,
  children,
}: {
  tone?: "dark" | "light";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-lg backdrop-blur-md",
        tone === "dark"
          ? "border-background/20 bg-foreground/45 text-background"
          : "border-border/70 bg-background/75 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Rounded, offset-friendly floating image card with hover zoom. */
export function FloatingImageCard({
  image,
  alt,
  aspect = "landscape",
  className,
  children,
}: {
  image: string;
  alt: string;
  aspect?: "portrait" | "landscape" | "square";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl shadow-xl", className)}>
      <div
        className={cn(
          "relative w-full",
          aspect === "portrait"
            ? "aspect-[3/4]"
            : aspect === "square"
              ? "aspect-square"
              : "aspect-[4/3]",
        )}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      {children}
    </div>
  );
}

/** Full-bleed image band (parallax + strong scrim) with children layered over it. */
export function ImageOverlaySection({
  image,
  imageAlt,
  className,
  scrim = "bg-foreground/80",
  children,
}: {
  image: string;
  imageAlt: string;
  className?: string;
  scrim?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      <Parallax offset={40} className="absolute inset-0">
        <div className="relative h-[130%] w-full">
          <Image src={image} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        </div>
      </Parallax>
      <div className={cn("absolute inset-0", scrim)} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export interface BandStat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

/** Image-backed stat band with frosted glass count-up cards (replaces flat strips). */
export function ImageStatBand({
  image,
  imageAlt,
  eyebrow,
  title,
  stats,
}: {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title?: string;
  stats: BandStat[];
}) {
  return (
    <ImageOverlaySection image={image} imageAlt={imageAlt} scrim="bg-foreground/85">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        {(eyebrow || title) && (
          <div className="mb-12 text-center">
            {eyebrow && (
              <Reveal>
                <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
                  {eyebrow}
                </p>
              </Reveal>
            )}
            {title && (
              <Reveal delay={0.08}>
                <h2 className="mx-auto max-w-2xl font-heading text-h1 font-semibold text-background">
                  {title}
                </h2>
              </Reveal>
            )}
          </div>
        )}
        <div
          className={cn(
            "grid grid-cols-2 gap-5",
            stats.length === 3
              ? "sm:grid-cols-3"
              : stats.length === 5
                ? "sm:grid-cols-3 lg:grid-cols-5"
                : "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-background/20 bg-foreground/30 p-8 text-center shadow-lg backdrop-blur-md">
                <div className="font-heading text-hero font-medium text-primary">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <p className="mx-auto mt-2 max-w-[12rem] text-caption uppercase tracking-wide text-background/85">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </ImageOverlaySection>
  );
}
