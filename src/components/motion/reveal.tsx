"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  /** Seconds to wait before animating (use for manual staggering). */
  delay?: number;
  /** Vertical travel distance in px. */
  y?: number;
  duration?: number;
  once?: boolean;
}

/**
 * Fade-up + slight translate as the element scrolls into view. Once revealed,
 * it stays. Under prefers-reduced-motion no animation props are applied, so it
 * renders statically.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  once = true,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        initial: { opacity: 0, y },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once, margin: "0px 0px -10% 0px" },
        transition: { duration, delay, ease: EASE },
      };

  return (
    <motion.div {...anim} {...props}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------- Staggered group (grids) */

interface RevealGroupProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  /** Delay between each child, in seconds. */
  stagger?: number;
  once?: boolean;
}

/**
 * Container that reveals its <RevealItem> children in sequence — for grids and
 * lists. Pair with RevealItem on each child.
 */
export function RevealGroup({
  children,
  stagger = 0.1,
  once = true,
  ...props
}: RevealGroupProps) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once, margin: "0px 0px -10% 0px" },
        variants: {
          hidden: {},
          show: { transition: { staggerChildren: stagger } },
        },
      };

  return (
    <motion.div {...anim} {...props}>
      {children}
    </motion.div>
  );
}

interface RevealItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  y?: number;
  duration?: number;
}

export function RevealItem({
  children,
  y = 24,
  duration = 0.6,
  ...props
}: RevealItemProps) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y },
          show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
        },
      };

  return (
    <motion.div {...anim} {...props}>
      {children}
    </motion.div>
  );
}
