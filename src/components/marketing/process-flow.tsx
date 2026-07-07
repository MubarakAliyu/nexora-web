"use client";

import { motion, useReducedMotion } from "framer-motion";
import { processSteps } from "@/content/services";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Animated process flow — each step reveals in sequence and a connector line
 *  "draws" from one step to the next (Consult → Onboard → Manage → Optimise). */
export function ProcessFlow() {
  const reduce = useReducedMotion();

  return (
    <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {processSteps.map((st, i) => (
        <motion.div
          key={st.step}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 0.5, ease: EASE, delay: i * 0.18 }}
          className="relative"
        >
          {/* Connector to the next step (desktop) — draws left-to-right */}
          {i < processSteps.length - 1 && (
            <motion.span
              aria-hidden
              className="absolute left-16 top-7 hidden h-px w-[calc(100%-2rem)] origin-left bg-primary/50 lg:block"
              initial={{ scaleX: reduce ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.18 + 0.4 }}
            />
          )}
          <span className="relative z-10 font-heading text-[3rem] font-medium leading-none text-primary/40">
            {st.step}
          </span>
          <h3 className="mt-3 font-heading text-h3 font-semibold text-background">
            {st.title}
          </h3>
          <p className="mt-2 text-body text-background/70">{st.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
