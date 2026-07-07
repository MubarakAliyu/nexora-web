"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Parallax } from "@/components/motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface MediaTextProps {
  image: string;
  imageAlt: string;
  /** Place the image on the right (content left). Also flips the slide-in direction. */
  reverse?: boolean;
  aspect?: "portrait" | "landscape";
  children: ReactNode;
  className?: string;
}

/** Alternating two-column block: image slides in from its side + parallaxes;
 *  content sits opposite. Reduced-motion → fade only. */
export function MediaText({
  image,
  imageAlt,
  reverse = false,
  aspect = "portrait",
  children,
  className,
}: MediaTextProps) {
  const reduce = useReducedMotion();
  const x = reduce ? 0 : reverse ? 48 : -48;

  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", className)}>
      <motion.div
        className={cn(reverse && "lg:order-2")}
        initial={{ opacity: 0, x }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Parallax offset={26} className="rounded-xl">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-xl",
              aspect === "portrait" ? "aspect-[4/5]" : "aspect-[4/3]",
            )}
          >
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Parallax>
      </motion.div>
      <div className={cn(reverse && "lg:order-1")}>{children}</div>
    </div>
  );
}
