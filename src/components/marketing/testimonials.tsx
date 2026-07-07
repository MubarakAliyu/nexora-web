"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AngleLeft, AngleRight, Quote } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { testimonials } from "@/content/home";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Auto-advancing testimonial carousel with manual controls; pauses on hover. */
export function Testimonials() {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [paused, setPaused] = React.useState(false);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) {
        setDir(1);
        setIndex((x) => (x + 1) % testimonials.length);
      }
    }, 7000);
    return () => window.clearInterval(id);
  }, [reduce]);

  const go = (d: number) => {
    setDir(d);
    setIndex((x) => (x + d + testimonials.length) % testimonials.length);
  };

  const t = testimonials[index];

  return (
    <section
      className="bg-surface-hover"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Quote size={40} className="mx-auto text-primary" />
        <div className="relative mt-6 min-h-[200px] sm:min-h-[168px]">
          <motion.blockquote
            key={index}
            className="absolute inset-x-0 top-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <p className="font-heading text-h2 font-medium leading-snug text-foreground">
              “{t.quote}”
            </p>
            <footer className="mt-6">
              <p className="font-medium text-foreground">{t.name}</p>
              <p className="text-caption text-muted">{t.role}</p>
            </footer>
          </motion.blockquote>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <AngleLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDir(idx > index ? 1 : -1);
                  setIndex(idx);
                }}
                aria-label={`Go to testimonial ${idx + 1}`}
                aria-current={idx === index ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <AngleRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
