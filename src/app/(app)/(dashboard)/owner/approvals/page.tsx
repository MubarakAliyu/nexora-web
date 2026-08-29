"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle, MapPin, UserCircle, Clock, Image as ImageIcon } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatUGX, formatDate } from "@/lib/format";
import { propertyName, unitLabel } from "@/lib/api/admin";
import { resolveStaff } from "@/lib/api/admin-mutations";
import {
  ticketsAwaitingOwnerApproval, approveMaintenance, declineMaintenance, waitingLabel, hoursAwaiting,
} from "@/lib/api/maintenance-routing";
import type { MaintenanceTicket } from "@/lib/mock/types";

/* ------------------------------------------------------------- approve */

function ApproveDialog({ ticket, onOpenChange, onDone }: {
  ticket: MaintenanceTicket | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const name = useSession((s) => s.user?.name ?? "Owner");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!ticket) return;
    setBusy(true);
    try {
      await approveMaintenance(ticket.id, name);
      toast.success("Repair approved", { description: `${ticket.ref} — work will be scheduled.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t approve the repair"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent>
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Approve this repair?</DialogTitle>
              <DialogDescription>{ticket.ref} · {ticket.title}</DialogDescription>
            </DialogHeader>
            <p className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-body text-foreground">
              Approve this repair at{" "}
              <span className="font-heading text-h3 font-semibold text-primary">{formatUGX(ticket.assessedCost ?? 0)}</span>?
              This cost will be deducted from your settlement.
            </p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy}>Approve repair</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- decline */

function DeclineDialog({ ticket, onOpenChange, onDone }: {
  ticket: MaintenanceTicket | null; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const name = useSession((s) => s.user?.name ?? "Owner");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (ticket) setReason(""); }, [ticket]);

  const submit = async () => {
    if (!ticket || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await declineMaintenance(ticket.id, reason.trim(), name);
      toast.success("Repair declined", { description: `${ticket.ref} will not proceed.` });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t decline the repair"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent>
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>Decline this repair</DialogTitle>
              <DialogDescription>{ticket.ref} · {formatUGX(ticket.assessedCost ?? 0)}</DialogDescription>
            </DialogHeader>
            <Field label="Reason" htmlFor="dm-reason" error={reason.trim().length >= 5 ? undefined : "Required"}>
              <Textarea id="dm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Why you are not proceeding with this repair" />
              {/* Owners and tenants do not deal with each other in this model — the
                  reason is for Nexora, and the tenant gets a neutral message only. */}
              <p className="mt-1 text-caption text-muted">
                Shared with the Nexora team only. The tenant is told the repair cannot proceed
                at present, without your reason.
              </p>
            </Field>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={reason.trim().length < 5}>Decline repair</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- page */

export default function OwnerApprovalsPage() {
  const ownerId = useSession((s) => s.user?.ownerId ?? "");
  const revision = useLive((s) => s.revision);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [approving, setApproving] = React.useState<MaintenanceTicket | null>(null);
  const [declining, setDeclining] = React.useState<MaintenanceTicket | null>(null);
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  const items = React.useMemo(
    () => (ownerId ? ticketsAwaitingOwnerApproval(ownerId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerId, revision, mounted],
  );

  if (!mounted) {
    return <div><Skeleton className="h-8 w-56" /><Skeleton className="mt-6 h-64 w-full rounded-xl" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Maintenance work on your properties that needs your decision before it proceeds"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={22} />}
          title="No approvals awaiting your decision."
          description="We'll let you know here when a repair needs your sign-off."
        />
      ) : (
        <div className="space-y-4">
          {items.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-h3 font-semibold text-foreground">{t.title}</h2>
                    <Badge className="border-transparent bg-surface-hover text-muted">{t.ref}</Badge>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-body text-muted">
                    <MapPin size={15} /> {propertyName(t.propertyId)} · {unitLabel(t.unitId)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-caption uppercase tracking-wide text-muted">Estimated cost</p>
                  <p className="font-heading text-h2 font-semibold text-primary">{formatUGX(t.assessedCost ?? 0)}</p>
                </div>
              </div>

              <p className="mt-3 text-body text-muted">{t.description}</p>

              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-caption font-medium uppercase tracking-wide text-muted">What the technician found</p>
                <p className="mt-1.5 text-body text-foreground">{t.assessmentNotes}</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-4 text-body">
                    <dt className="text-muted">Labour</dt><dd className="text-foreground">{formatUGX(t.assessedLabour ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-body">
                    <dt className="text-muted">Materials</dt><dd className="text-foreground">{formatUGX(t.assessedMaterials ?? 0)}</dd>
                  </div>
                </dl>
                <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-center">
                  <ImageIcon size={18} className="mx-auto text-muted" />
                  <p className="mt-1 text-caption text-muted">Assessment photos — available once file storage is wired in.</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-caption text-muted">
                {/* assessedBy is a staff id (F3 stores the reference, not the label). */}
                {t.assessedBy && <span className="inline-flex items-center gap-1.5"><UserCircle size={14} /> Assessed by {resolveStaff(t.assessedBy)?.name ?? t.assessedBy}</span>}
                {t.assessedAt && <span>{formatDate(t.assessedAt)}</span>}
                <span className={cn("inline-flex items-center gap-1.5", hoursAwaiting(t) >= 48 && "font-medium text-primary")}>
                  <Clock size={14} /> Awaiting your decision — {waitingLabel(t)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setApproving(t)}>Approve</Button>
                <Button variant="outline" onClick={() => setDeclining(t)}>Decline</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/owner" className="text-body font-medium text-primary transition-colors hover:text-accent">
          ← Back to dashboard
        </Link>
      </div>

      <ApproveDialog ticket={approving} onOpenChange={(o) => !o && setApproving(null)} onDone={force} />
      <DeclineDialog ticket={declining} onOpenChange={(o) => !o && setDeclining(null)} onDone={force} />
    </div>
  );
}
