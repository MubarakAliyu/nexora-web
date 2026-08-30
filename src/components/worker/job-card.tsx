"use client";

/**
 * A job as a worker sees it (F4.3). Card, not table row — this is read at arm's
 * length on a phone, so the service, the customer, where and when are the whole
 * content and everything is a 44px+ tap target.
 */
import * as React from "react";
import Link from "next/link";
import {
  MapPin, Clock, UserCircle, Home, Truck, TShirt, Tools,
} from "flowbite-react-icons/outline";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { WorkerJob, WorkerJobStage } from "@/lib/api/worker-jobs";
import { cn } from "@/lib/utils";

export const STAGE_LABEL: Record<WorkerJobStage, string> = {
  assigned: "New — respond",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Awaiting confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

/** Palette-only tones — the six tokens, no raw colours. */
const stageTone: Record<WorkerJobStage, string> = {
  assigned: "border-primary/40 bg-primary/10 text-primary",
  accepted: "border-border bg-surface-hover text-foreground",
  in_progress: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-border bg-surface-hover text-muted",
  confirmed: "border-border bg-surface-hover text-muted",
  declined: "border-border bg-surface-hover text-muted",
  cancelled: "border-border bg-surface-hover text-muted",
};

function CategoryIcon({ category, kind }: { category: string; kind: WorkerJob["kind"] }) {
  const c = category.toLowerCase();
  if (kind === "maintenance") return <Tools size={18} />;
  if (c.includes("car") || c.includes("wash")) return <Truck size={18} />;
  if (c.includes("laundry")) return <TShirt size={18} />;
  return <Home size={18} />;
}

const timeOf = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

export function JobCard({ job }: { job: WorkerJob }) {
  const time = timeOf(job.scheduledAt);
  return (
    <Link
      href={`/worker/jobs/${job.id}`}
      className="block rounded-2xl border border-border bg-surface-elevated p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-xl bg-surface-hover p-2 text-primary">
            <CategoryIcon category={job.category} kind={job.kind} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-h3 font-semibold text-foreground">{job.title}</p>
            <p className="truncate text-caption text-muted">{job.reference}</p>
          </div>
        </div>
        <Badge className={cn("shrink-0 whitespace-nowrap", stageTone[job.stage])}>
          {STAGE_LABEL[job.stage]}
        </Badge>
      </div>

      <dl className="mt-3 space-y-1.5 text-body">
        <div className="flex items-start gap-2 text-muted">
          <UserCircle size={16} className="mt-0.5 shrink-0" />
          <span className="truncate text-foreground">{job.customerName}</span>
        </div>
        <div className="flex items-start gap-2 text-muted">
          <MapPin size={16} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{job.address}</span>
        </div>
        {job.scheduledAt && (
          <div className="flex items-start gap-2 text-muted">
            <Clock size={16} className="mt-0.5 shrink-0" />
            <span>{formatDate(job.scheduledAt)}{time ? ` · ${time}` : ""}</span>
          </div>
        )}
      </dl>
    </Link>
  );
}
