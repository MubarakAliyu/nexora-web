import Image from "next/image";
import { Reveal } from "@/components/motion";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
}

/** Shorter branded hero band (sits below the solid header on non-hero pages).
 *  Ken-Burns image via CSS + scrim for legibility. */
export function PageHero({ eyebrow, title, subtitle, image, imageAlt }: PageHeroProps) {
  return (
    <section className="relative flex min-h-[380px] items-center overflow-hidden bg-foreground md:min-h-[500px]">
      <div className="absolute inset-0 animate-kenburns motion-reduce:animate-none">
        <Image src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/65 to-foreground/40" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 md:px-10 md:py-28">
        {eyebrow && (
          <Reveal>
            <p className="mb-4 text-caption font-medium uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
          </Reveal>
        )}
        <Reveal delay={0.08}>
          <h1 className="max-w-3xl font-heading text-h1 font-semibold leading-tight text-background md:text-hero md:leading-[1.06]">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-body leading-relaxed text-background/85">
              {subtitle}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
