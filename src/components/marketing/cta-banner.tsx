import Image from "next/image";
import { Reveal } from "@/components/motion";
import { CtaButton } from "./cta-button";

interface CtaBannerProps {
  heading: string;
  subline: string;
  image: string;
  imageAlt: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string; external?: boolean };
}

/** Reusable finale CTA band over a property image with scrim + hover zoom.
 *  The image fills the section directly (positioned by the section, which has a
 *  definite height from the content) so it always renders; a slow group-hover
 *  scale gives the same living-image feel as the portfolio/media cards. */
export function CtaBanner({
  heading,
  subline,
  image,
  imageAlt,
  primary,
  secondary,
}: CtaBannerProps) {
  return (
    <section className="group relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-[1400ms] ease-out will-change-transform motion-safe:group-hover:scale-[1.06]"
        />
      </div>
      {/* Lighter scrim so the imagery reads clean — darkest behind the centred
          text (AA), lighter top/bottom so the photo shows through. */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/78 to-foreground/45" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <Reveal>
          <h2 className="font-heading text-h1 font-semibold leading-tight text-background [text-shadow:0_2px_20px_rgba(35,34,32,0.55)] md:text-hero md:leading-[1.1]">
            {heading}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-body text-background [text-shadow:0_1px_14px_rgba(35,34,32,0.6)]">
            {subline}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CtaButton href={primary.href} size="lg">
              {primary.label}
            </CtaButton>
            {secondary && (
              <a
                href={secondary.href}
                target={secondary.external ? "_blank" : undefined}
                rel={secondary.external ? "noopener noreferrer" : undefined}
                className="font-medium text-background underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {secondary.label}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
