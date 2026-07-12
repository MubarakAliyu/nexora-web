"use client";

import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useNotifications } from "@/lib/stores/notifications";
import type { NotificationType } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

const typeLabels: Record<NotificationType, string> = {
  payment: "Payment",
  maintenance: "Maintenance",
  lease: "Lease",
  announcement: "Announcement",
  system: "System",
};

const PAGE_SIZE = 6;

/** Shared notifications list (audience-scoped via the store). Used by the admin
 *  /notifications page and the Owner portal's /owner/notifications. */
export function NotificationsView({ title = "Notifications", subtitle }: { title?: string; subtitle?: string }) {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const [filter, setFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const filtered = items.filter((n) =>
    filter === "all" ? true : filter === "unread" ? n.status !== "read" : n.type === filter,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Only show type chips that actually occur in this audience's feed.
  const presentTypes = Array.from(new Set(items.map((n) => n.type)));
  const chips: { k: string; l: string }[] = [
    { k: "all", l: "All" },
    { k: "unread", l: "Unread" },
    ...presentTypes.map((t) => ({ k: t, l: typeLabels[t] })),
  ];

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>}
      />

      <div className="mb-6 -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
        {chips.map((c) => (
          <button
            key={c.k}
            type="button"
            onClick={() => { setFilter(c.k); setPage(1); }}
            aria-pressed={filter === c.k}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              filter === c.k
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {c.l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-4 rounded-xl border bg-background p-4 shadow-sm",
              n.status !== "read" ? "border-primary/30" : "border-border",
            )}
          >
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.status !== "read" ? "bg-primary" : "bg-border")} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{n.title}</p>
                <Badge variant="muted">{typeLabels[n.type]}</Badge>
                {mounted && <span className="text-caption text-muted">{fmt(n.sent_at)}</span>}
              </div>
              <p className="mt-1 text-body text-muted">{n.body}</p>
            </div>
            {n.status !== "read" && (
              <button
                type="button"
                onClick={() => markRead(n.id)}
                className="shrink-0 text-caption font-medium text-primary transition-colors hover:text-accent"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-body text-muted">
            No notifications to show.
          </div>
        )}
      </div>

      <div className="mt-8">
        <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
