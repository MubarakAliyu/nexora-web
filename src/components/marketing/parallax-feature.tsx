import Image from "next/image";
import { Parallax, Reveal } from "@/components/motion";

/** Full-bleed parallax feature band — a designed transition between a light and
 *  a dark section, with a Cinzel pull-quote. */
export function ParallaxFeature({
  quote,
  image,
  imageAlt,
}: {
  quote: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <Parallax offset={50} className="absolute inset-0">
        <div className="relative h-[130%] w-full">
          <Image src={image} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        </div>
      </Parallax>
      <div className="absolute inset-0 bg-foreground/70" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center md:py-36">
        <Reveal>
          <p className="font-heading text-h2 font-medium italic leading-snug text-background md:text-[2.4rem] md:leading-[1.25]">
            “{quote}”
          </p>
        </Reveal>
      </div>
    </section>
  );
}
