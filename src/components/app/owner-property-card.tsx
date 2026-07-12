import Link from "next/link";
import Image from "next/image";
import { MapPin, Home } from "flowbite-react-icons/outline";
import { StatusBadge } from "@/components/app/status";
import { formatUGX } from "@/lib/format";
import type { Property } from "@/lib/api/admin";

/**
 * Owner-facing property card: hover-lift + a subtle, fast thumbnail zoom on
 * hover (CSS transform — not the marketing site's slow Ken-Burns). Read-only,
 * links into the owner property detail.
 */
export function OwnerPropertyCard({ property: p }: { property: Property }) {
  return (
    <Link
      href={`/owner/properties/${p.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface-elevated transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative h-40 w-full overflow-hidden bg-surface-active">
        <Image
          src={p.image}
          alt={p.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute right-3 top-3">
          <StatusBadge status={p.status} />
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-heading text-h3 font-semibold text-foreground">{p.name}</h3>
        <p className="mt-1 inline-flex items-center gap-1.5 text-caption text-muted">
          <MapPin size={14} /> {p.location}
        </p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-caption uppercase tracking-wide text-muted">Revenue / mo</p>
            <p className="font-heading text-h3 font-semibold text-foreground">{formatUGX(p.monthlyRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="inline-flex items-center gap-1 text-body text-foreground"><Home size={15} /> {p.units}</p>
            <p className="text-caption text-muted">{p.occupancy}% occupied</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
