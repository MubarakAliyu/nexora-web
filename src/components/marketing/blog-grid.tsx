"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { posts, blogCategories, type BlogCategory } from "@/content/blog";

const EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_SIZE = 6;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BlogGrid() {
  const reduce = useReducedMotion();
  const [filter, setFilter] = React.useState<"All" | BlogCategory>("All");
  const [page, setPage] = React.useState(1);
  const chips: ("All" | BlogCategory)[] = ["All", ...blogCategories];

  const filtered = filter === "All" ? posts : posts.filter((p) => p.category === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const selectFilter = (c: "All" | BlogCategory) => {
    setFilter(c);
    setPage(1);
  };

  return (
    <div>
      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:gap-3">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => selectFilter(c)}
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
        <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
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
                href={`/blog/${p.slug}`}
                className="group block h-full overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground">
                    {p.category}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-caption text-muted">
                    {formatDate(p.date)} · {p.readingTime}
                  </p>
                  <h3 className="mt-2 font-heading text-h3 font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-body text-muted">{p.excerpt}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>

      <div className="mt-12">
        <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
