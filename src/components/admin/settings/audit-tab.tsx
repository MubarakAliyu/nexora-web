"use client";

import * as React from "react";
import { Search, AngleDown, AngleRight } from "flowbite-react-icons/outline";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { selectClass } from "@/components/forms/field";
import { useAudit, type AuditEntry } from "@/lib/stores/audit";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const actionTone: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  created: "good", updated: "neutral", deleted: "bad", renewed: "good", terminated: "bad",
  status_changed: "neutral", invited: "good", sent: "neutral",
};
function ActionBadge({ action }: { action: string }) {
  const tone = actionTone[action] ?? "neutral";
  const cls = tone === "good" ? "bg-surface-active text-foreground" : tone === "bad" ? "bg-primary/10 text-primary" : tone === "warn" ? "bg-surface-hover text-muted" : "border-border text-foreground";
  return <Badge className={cn("border-transparent capitalize", cls)}>{action.replace("_", " ")}</Badge>;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AuditTab() {
  const entries = useAudit((s) => s.entries);
  const [q, setQ] = React.useState("");
  const [actor, setActor] = React.useState("all");
  const [entity, setEntity] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const actors = React.useMemo(() => Array.from(new Set(entries.map((e) => e.actor))), [entries]);
  const entityTypes = React.useMemo(() => Array.from(new Set(entries.map((e) => e.entityType))), [entries]);
  const actions = React.useMemo(() => Array.from(new Set(entries.map((e) => e.action))), [entries]);

  const filtered = entries.filter((e) => {
    if (actor !== "all" && e.actor !== actor) return false;
    if (entity !== "all" && e.entityType !== entity) return false;
    if (action !== "all" && e.action !== action) return false;
    if (q && !(`${e.entityName} ${e.summary}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (from && new Date(e.at) < new Date(from)) return false;
    if (to && new Date(e.at) > new Date(to + "T23:59:59")) return false;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder="Search entity or details…" aria-label="Search audit" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} lg:w-44`} value={actor} onChange={(e) => { setActor(e.target.value); resetPage(); }} aria-label="Filter by user">
          <option value="all">All users</option>{actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={`${selectClass} lg:w-40 capitalize`} value={entity} onChange={(e) => { setEntity(e.target.value); resetPage(); }} aria-label="Filter by entity">
          <option value="all">All entities</option>{entityTypes.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        <select className={`${selectClass} lg:w-40 capitalize`} value={action} onChange={(e) => { setAction(e.target.value); resetPage(); }} aria-label="Filter by action">
          <option value="all">All actions</option>{actions.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} aria-label="From date" className="h-10 w-40" />
          <span className="text-caption text-muted">to</span>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} aria-label="To date" className="h-10 w-40" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit entries" description={entries.length === 0 ? "Actions you take (create/edit/delete) will be logged here." : "No entries match your filters."} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-body">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted">Time</th>
                  <th className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted">User</th>
                  <th className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted">Action</th>
                  <th className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted">Entity</th>
                  <th className="px-4 py-3 text-left text-caption font-semibold uppercase tracking-wide text-muted">Name</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e: AuditEntry) => {
                  const open = expanded === e.id;
                  const hasDetail = e.before || e.after || e.summary;
                  return (
                    <React.Fragment key={e.id}>
                      <tr className="cursor-pointer border-t border-border hover:bg-surface-hover" onClick={() => setExpanded(open ? null : e.id)}>
                        <td className="px-3 py-3 text-muted">{hasDetail ? (open ? <AngleDown size={16} /> : <AngleRight size={16} />) : null}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{fmt(e.at)}</td>
                        <td className="px-4 py-3 text-foreground">{e.actor}</td>
                        <td className="px-4 py-3"><ActionBadge action={e.action} /></td>
                        <td className="px-4 py-3 capitalize text-muted">{e.entityType.replace("_", " ")}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{e.entityName}</td>
                      </tr>
                      {open && hasDetail && (
                        <tr className="border-t border-border bg-surface-hover/40">
                          <td />
                          <td colSpan={5} className="px-4 py-3">
                            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
                              <p className="text-body text-foreground">{e.summary}</p>
                              {(e.before || e.after) && (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  {e.before && (
                                    <div className="rounded-md border border-border bg-surface-elevated p-3">
                                      <p className="mb-1 text-caption font-medium uppercase tracking-wide text-muted">Before</p>
                                      <pre className="whitespace-pre-wrap break-words font-sans text-caption text-foreground">{JSON.stringify(e.before, null, 2)}</pre>
                                    </div>
                                  )}
                                  {e.after && (
                                    <div className="rounded-md border border-border bg-surface-elevated p-3">
                                      <p className="mb-1 text-caption font-medium uppercase tracking-wide text-muted">After</p>
                                      <pre className="whitespace-pre-wrap break-words font-sans text-caption text-foreground">{JSON.stringify(e.after, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-caption text-muted">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</p>
            <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
