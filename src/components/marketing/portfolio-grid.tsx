"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, LayoutGroup } from "framer-motion";
import { MapPin } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { properties, categories, type Category } from "@/content/portfolio";
import { properties as dbProperties } from "@/lib/mock/db";
import type { RentalType } from "@/lib/mock/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Rental type per slug — single source of truth is the seeded property data. */
const RENTAL_TYPE: Record<string, RentalType | undefined> = Object.fromEntries(
  dbProperties.map((p) => [p.id, p.rentalType]),
);

/** Filterable portfolio grid. Filter chips reflow the grid via Framer `layout`
 *  (positions animate, not just show/hide). Cards scroll-reveal with a subtle
 *  scale-up and zoom on hover. No AnimatePresence (reliable). */
export function PortfolioGrid() {
  const reduce = useReducedMotion();
  const [filter, setFilter] = React.useState<"All" | Category>("All");
  const chips: ("All" | Category)[] = ["All", ...categories];
  const visible =
    filter === "All" ? properties : properties.filter((p) => p.category === filter);

  return (
    <div>
      {/* Filter chips (scroll/wrap on mobile) */}
      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:gap-3">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              filter === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <LayoutGroup>
        <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <motion.div
              layout
              key={p.slug}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.5, ease: EASE }}
              className="h-full"
            >
              <Link
                href={`/portfolio/${p.slug}`}
                className="group block h-full overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground">
                    {p.category}
                  </span>
                  {RENTAL_TYPE[p.slug] && (
                    <span
                      className={cn(
                        "absolute right-3 top-3 rounded-full px-2.5 py-1 text-caption font-semibold",
                        RENTAL_TYPE[p.slug] === "short-term" ? "bg-primary text-primary-foreground" : "bg-foreground/90 text-background",
                      )}
                    >
                      {RENTAL_TYPE[p.slug] === "short-term" ? "Short-Term" : "Long-Term"}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-h3 font-semibold text-foreground">
                    {p.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                    <MapPin size={14} />
                    {p.location}
                  </p>
                  <div className="mt-4 flex gap-6 border-t border-border pt-4">
                    <div>
                      <p className="font-heading text-h3 font-semibold text-primary">
                        {p.units}
                      </p>
                      <p className="text-caption text-muted">Units</p>
                    </div>
                    <div>
                      <p className="font-heading text-h3 font-semibold text-primary">
                        {p.occupancy}%
                      </p>
                      <p className="text-caption text-muted">Occupancy</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
