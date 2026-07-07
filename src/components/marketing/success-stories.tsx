"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { successStories } from "@/content/portfolio";

/** Tabbed success-story showcase — CSS crossfade over persistent layers
 *  (keyed/CSS pattern, no AnimatePresence). */
export function SuccessStories() {
  const [active, setActive] = React.useState(0);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div className="order-2 lg:order-1">
        <ul className="flex flex-col">
          {successStories.map((st, i) => (
            <li key={st.name}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "group flex w-full items-center gap-4 border-b border-border py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  i === active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                <span className="font-sans text-caption tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-heading text-h3 font-medium">{st.name}</span>
                  <span className="text-caption text-muted">{st.category}</span>
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
        <p key={active} className="mt-6 text-body text-muted">
          {successStories[active].result}
        </p>
      </div>

      <div className="order-1 lg:order-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          {successStories.map((st, i) => (
            <div
              key={st.name}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                i === active ? "opacity-100" : "opacity-0",
              )}
            >
              <Image
                src={st.image}
                alt={st.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
