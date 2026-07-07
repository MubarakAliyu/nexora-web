import Image from "next/image";
import { Reveal, Parallax } from "@/components/motion";
import { CtaButton } from "./cta-button";

interface CtaBannerProps {
  heading: string;
  subline: string;
  image: string;
  imageAlt: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string; external?: boolean };
}

/** Reusable finale CTA band over a property image with scrim + gentle parallax. */
export function CtaBanner({
  heading,
  subline,
  image,
  imageAlt,
  primary,
  secondary,
}: CtaBannerProps) {
  return (
    <section className="relative overflow-hidden">
      <Parallax offset={40} className="absolute inset-0">
        <div className="relative h-[125%] w-full">
          <Image src={image} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        </div>
      </Parallax>
      <div className="absolute inset-0 bg-foreground/75" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <Reveal>
          <h2 className="font-heading text-h1 font-semibold leading-tight text-background md:text-hero md:leading-[1.1]">
            {heading}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-body text-background/85">{subline}</p>
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
