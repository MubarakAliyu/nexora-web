"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  /** Target value to count to. */
  to: number;
  from?: number;
  /** Seconds for the count animation. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Start on mount instead of on scroll-into-view (for above-the-fold KPIs). */
  immediate?: boolean;
}

/**
 * Counts from `from` to `to` when scrolled into view — or immediately on mount
 * when `immediate` is set (dashboard KPIs, which sit above the fold and must not
 * depend on an IntersectionObserver firing). Reduced-motion shows the final
 * value at once.
 */
export function CountUp({
  to,
  from = 0,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  immediate = false,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(from);
  const start = immediate || inView;

  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    // Guarantee the final value even if requestAnimationFrame is throttled (e.g.
    // background/preview tabs where framer's rAF loop never advances).
    const settle = setTimeout(() => setValue(to), duration * 1000 + 80);
    return () => {
      controls.stop();
      clearTimeout(settle);
    };
  }, [start, reduce, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
