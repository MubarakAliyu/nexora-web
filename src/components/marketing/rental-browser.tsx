"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Home, Bed, CheckCircle, Search } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { formatUGX } from "@/lib/format";
import { selectClass } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync } from "@/lib/use-async";
import {
  listRentals, getRentalFacets,
  type RentalListing, type RentalFilters,
} from "@/lib/api/rentals";

const EASE = [0.22, 1, 0.36, 1] as const;

type Tab = "all" | "short-term" | "long-term";
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All rentals" },
  { value: "short-term", label: "Short-term" },
  { value: "long-term", label: "Long-term" },
];

const PRICE_OPTIONS = [
  { value: 0, label: "Any price" },
  { value: 2_000_000, label: "Up to 2M / mo" },
  { value: 3_000_000, label: "Up to 3M / mo" },
  { value: 5_000_000, label: "Up to 5M / mo" },
];

function RentalCard({ p, reduce }: { p: RentalListing; reduce: boolean | null }) {
  const short = p.rentalType === "short-term";
  const price = short ? p.shortTerm!.daily : Math.round((p.annualRent ?? 0) / 12);
  const period = short ? "night" : "month";

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 22 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="h-full"
    >
      <Link
        href={`/rentals/${p.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-caption font-semibold",
              short ? "bg-primary text-primary-foreground" : "bg-foreground/90 text-background",
            )}
          >
            {short ? "Short-term" : "Long-term"}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground">
            {p.category}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-heading text-h3 font-semibold text-foreground">{p.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
            <MapPin size={14} /> {p.location}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5"><Bed size={14} /> {p.bedrooms > 0 ? `${p.bedrooms} bed` : "Commercial"}</span>
            <span className="inline-flex items-center gap-1.5"><Home size={14} /> {p.availableUnits} available</span>
          </div>

          {/* amenities preview */}
          {p.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.amenities.slice(0, 3).map((a) => (
                <span key={a} className="rounded-md bg-surface-hover px-2 py-0.5 text-caption text-muted">{a}</span>
              ))}
              {p.amenities.length > 3 && (
                <span className="rounded-md bg-surface-hover px-2 py-0.5 text-caption text-muted">+{p.amenities.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="font-heading text-h3 font-semibold text-primary">{formatUGX(price)}</p>
              <p className="text-caption text-muted">per {period}</p>
            </div>
            <span className="text-caption font-medium text-primary transition-colors group-hover:text-accent">
              {short ? "Book now →" : "Enquire →"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function RentalBrowser() {
  const reduce = useReducedMotion();
  const [tab, setTab] = React.useState<Tab>("all");
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [location, setLocation] = React.useState("all");
  const [bedrooms, setBedrooms] = React.useState<string>("any");
  const [maxPrice, setMaxPrice] = React.useState(0);
  const [amenities, setAmenities] = React.useState<string[]>([]);

  const facets = useAsync(() => getRentalFacets(), []);

  const filters: RentalFilters = React.useMemo(
    () => ({
      rentalType: tab,
      q: q || undefined,
      category,
      location: location === "all" ? undefined : location,
      bedrooms: bedrooms === "any" ? "any" : Number(bedrooms),
      maxPrice: maxPrice || undefined,
      amenities: amenities.length ? amenities : undefined,
    }),
    [tab, q, category, location, bedrooms, maxPrice, amenities],
  );

  const { data, loading, error, reload } = useAsync(() => listRentals(filters), [filters]);

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const topAmenities = (facets.data?.amenities ?? []).slice(0, 8);

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={cn(
              "rounded-full border px-5 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              tab === t.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-xl border border-border bg-surface-hover p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search rentals" className="h-11 pl-10" />
        </div>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Property type">
          <option value="all">All types</option>
          {(facets.data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location">
          <option value="all">All locations</option>
          {(facets.data?.locations ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className={selectClass} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} aria-label="Bedrooms">
          <option value="any">Any beds</option>
          <option value="1">1+ bed</option>
          <option value="2">2+ beds</option>
          <option value="3">3+ beds</option>
          <option value="4">4+ beds</option>
        </select>
        <select className={selectClass} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="Max price">
          {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Amenity chips */}
      {topAmenities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {topAmenities.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              aria-pressed={amenities.includes(a)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                amenities.includes(a)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted hover:border-primary hover:text-primary",
              )}
            >
              {amenities.includes(a) && <CheckCircle size={13} />}
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-caption text-muted">
          {loading ? "Loading…" : `${data?.length ?? 0} ${data?.length === 1 ? "rental" : "rentals"}`}
        </p>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl border border-border bg-surface-hover" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn’t load rentals" description={error} action={<button onClick={reload} className="text-primary hover:text-accent">Try again</button>} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Home size={22} />}
          title="No rentals match your filters"
          description="Try widening your search — clear a filter or switch tabs."
        />
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((p) => <RentalCard key={p.id} p={p} reduce={reduce} />)}
        </div>
      )}
    </div>
  );
}
