import Image from "next/image";
import { Reveal, Parallax } from "@/components/motion";
import { CtaButton } from "./cta-button";
import { ctaBanner } from "@/content/home";
import { whatsappHref } from "@/content/site";

/** Finale CTA banner over a property image with scrim + gentle parallax. */
export function HomeCta() {
  return (
    <section className="relative overflow-hidden">
      <Parallax offset={40} className="absolute inset-0">
        <div className="relative h-[125%] w-full">
          <Image
            src={ctaBanner.image}
            alt={ctaBanner.imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </Parallax>
      <div className="absolute inset-0 bg-foreground/75" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <Reveal>
          <h2 className="font-heading text-h1 font-semibold leading-tight text-background md:text-hero md:leading-[1.1]">
            {ctaBanner.heading}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-body text-background/85">
            {ctaBanner.subline}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CtaButton href={ctaBanner.primary.href} size="lg">
              {ctaBanner.primary.label}
            </CtaButton>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-background underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              or chat with us on WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
