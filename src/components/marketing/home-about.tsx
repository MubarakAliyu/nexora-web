"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, Parallax } from "@/components/motion";
import { AnimatedLink } from "./animated-link";
import { about } from "@/content/home";

/** About / intro — image slides in from the side + parallaxes; text staggers. */
export function HomeAbout() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: -48 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Parallax offset={28} className="rounded-xl">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
              <Image
                src={about.image}
                alt={about.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Parallax>
        </motion.div>

        <div>
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
              {about.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-heading text-h1 font-semibold text-foreground">
              {about.heading}
            </h2>
          </Reveal>
          {about.body.map((para, i) => (
            <Reveal key={i} delay={0.16 + i * 0.08}>
              <p className="mt-4 text-body leading-relaxed text-muted">{para}</p>
            </Reveal>
          ))}
          <Reveal delay={0.32}>
            <div className="mt-7">
              <AnimatedLink href={about.cta.href}>{about.cta.label}</AnimatedLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
