"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { projects } from "@/content/home";
import { AnimatedLink } from "./animated-link";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Tabbed project showcase (Ilios "Nos projets" pattern) — selecting a name
 *  crossfades a large feature image + details. Auto-advances; pauses on hover. */
export function FeaturedProjects() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) setActive((a) => (a + 1) % projects.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [reduce]);

  const p = projects[active];

  return (
    <section
      className="bg-foreground text-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <p className="mb-3 text-caption font-medium uppercase tracking-[0.2em] text-primary">
          Featured projects
        </p>
        <h2 className="font-heading text-h1 font-semibold text-background">
          Properties we manage
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Selectable list */}
          <ul className="order-2 flex flex-col lg:order-1">
            {projects.map((proj, i) => (
              <li key={proj.name}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-4 border-b border-background/15 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    i === active
                      ? "text-background"
                      : "text-background/45 hover:text-background/80",
                  )}
                >
                  <span className="font-sans text-caption tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-heading text-h3 font-medium">
                    {proj.name}
                  </span>
                  <span
                    className={cn(
                      "h-px bg-primary transition-all duration-500",
                      i === active ? "w-10" : "w-0",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>

          {/* Feature image + details */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-foreground">
              {/* Keyed remount — new image fades + zooms in on select (reliable). */}
              <motion.div
                key={active}
                className="absolute inset-0"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </motion.div>
            </div>

            {/* Details re-mount on key change (no exit to get stuck) */}
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
              className="mt-6"
            >
              <p className="text-caption uppercase tracking-widest text-primary">
                {p.location}
              </p>
              <h3 className="mt-1 font-heading text-h2 font-semibold text-background">
                {p.title}
              </h3>
              <p className="mt-3 max-w-lg text-body text-background/75">
                {p.description}
              </p>
              <div className="mt-5">
                <AnimatedLink href={p.href} className="hover:!text-background">
                  View project
                </AnimatedLink>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
