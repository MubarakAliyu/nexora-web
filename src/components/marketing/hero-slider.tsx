"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { AngleLeft, AngleRight, Phone } from "flowbite-react-icons/outline";
import { Facebook, Instagram, Linkedin, Youtube } from "flowbite-react-icons/solid";
import { cn } from "@/lib/utils";
import { heroSlides } from "@/content/home";
import { contact } from "@/content/site";
import { CtaButton } from "./cta-button";

const DURATION = 6000;
const EASE = [0.22, 1, 0.36, 1] as const;

const heroSocials = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

export function HeroSlider() {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const pausedRef = React.useRef(false);
  const count = heroSlides.length;
  const slide = heroSlides[index];

  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const go = React.useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // Autoplay + progress (rAF-free interval so hover can pause cleanly).
  React.useEffect(() => {
    if (reduce) {
      setProgress(1);
      return;
    }
    setProgress(0);
    let elapsed = 0;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (pausedRef.current) return;
      elapsed += dt;
      const p = Math.min(elapsed / DURATION, 1);
      setProgress(p);
      if (p >= 1) setIndex((i) => (i + 1) % count);
    }, 40);
    return () => window.clearInterval(id);
  }, [index, reduce, count]);

  const textVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <section
      className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-foreground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      {/* Background image — keyed remount fades the new slide in over the dark
          section while a slow Ken-Burns zoom runs (reliable mount animation). */}
      <motion.div
        key={index}
        className="absolute inset-0 z-[1]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          initial={reduce ? { scale: 1 } : { scale: 1.02 }}
          animate={reduce ? { scale: 1 } : { scale: 1.1 }}
          transition={{ duration: reduce ? 0 : DURATION / 1000 + 1.5, ease: "linear" }}
        >
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </motion.div>
      {/* Scrim for legibility (over all layers) */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-foreground/85 via-foreground/55 to-foreground/25" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-foreground/70 via-transparent to-foreground/30" />

      {/* Text content — keyed remount replays the stagger on each slide */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 md:px-10">
        <motion.div
          key={index}
          className="max-w-3xl"
          variants={textVariants}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={itemVariants}
            className="mb-5 text-caption font-medium uppercase tracking-[0.25em] text-background/80"
          >
            {slide.eyebrow}
          </motion.p>
          {slide.headlineLines.map((line, i) => (
            <motion.h1
              key={i}
              variants={itemVariants}
              className="font-heading text-hero font-medium leading-[1.06] tracking-[-0.01em] text-background"
            >
              {line}
            </motion.h1>
          ))}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-xl text-body leading-relaxed text-background/85"
          >
            {slide.subline}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-9">
            <CtaButton href={slide.cta.href} size="lg">
              {slide.cta.label}
            </CtaButton>
          </motion.div>
        </motion.div>
      </div>

      {/* Left social rail */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -12 }}
        animate={reduce ? undefined : { opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
        className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-5 lg:flex"
      >
        <span className="h-16 w-px bg-background/40" />
        {heroSocials.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-background/70 transition-all duration-300 hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon size={18} />
          </a>
        ))}
      </motion.div>

      {/* Contact affordance (bottom-left) */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
        className="absolute bottom-8 left-6 z-10 hidden items-center gap-3 md:flex md:left-10"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-background/40 text-background">
          <Phone size={18} />
        </span>
        <div>
          <p className="text-caption uppercase tracking-widest text-background/70">
            Contact us
          </p>
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="text-body font-medium text-background transition-colors hover:text-primary"
          >
            {contact.phone}
          </a>
        </div>
      </motion.div>

      {/* Counter + progress + arrows (bottom-right) */}
      <div className="absolute bottom-8 right-6 z-10 flex items-center gap-5 md:right-10">
        <div className="flex items-center gap-3">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "font-sans text-caption font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                i === index ? "text-primary" : "text-background/60 hover:text-background",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
          <div className="relative ml-1 h-px w-20 bg-background/30 md:w-28">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-background/40 text-background transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <AngleLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-background/40 text-background transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <AngleRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
