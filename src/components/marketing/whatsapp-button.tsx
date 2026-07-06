"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Whatsapp } from "flowbite-react-icons/solid";
import { whatsappHref } from "@/content/site";

/** Site-wide floating WhatsApp affordance (marketing only). */
export function WhatsAppButton() {
  const reduce = useReducedMotion();

  return (
    <motion.a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group fixed bottom-5 right-5 z-40 flex items-center focus-visible:outline-none"
    >
      {/* Label reveal on hover (desktop) */}
      <span className="pointer-events-none mr-3 hidden translate-x-2 rounded-md bg-foreground px-3 py-1.5 text-caption font-medium text-background opacity-0 shadow-md transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:block">
        Chat with us
      </span>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/15 transition-transform duration-300 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <Whatsapp size={28} />
      </span>
    </motion.a>
  );
}
