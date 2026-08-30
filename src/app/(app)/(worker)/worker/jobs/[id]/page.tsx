"use client";

/**
 * JOB DETAIL (F4.3, screen 2).
 *
 * THE AGREED SCOPE is the point of this screen. A worker who does not know
 * exactly what the customer paid for cannot recognise when they are being asked
 * for something beyond it — which is the whole reason F2's additional-charge
 * flow exists. So the F1 quotation is rendered line by line, at the price the
 * customer accepted, not the current catalogue price.
 */
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AngleLeft, MapPin, Phone, Clock, UserCircle, FileLines, InfoCircle,
} from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatUGX, formatDate } from "@/lib/format";
import { staffForUser } from "@/lib/api/worker";
import {
  jobById, acceptJob, declineJob, startJob, completeJob,
} from "@/lib/api/worker-jobs";
import { STAGE_LABEL } from "@/components/worker/job-card";
import { RaiseChargeSheet } from "@/components/worker/raise-charge-sheet";
import { cn } from "@/lib/utils";

export default function WorkerJobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [declineOpen, setDeclineOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [chargeOpen, setChargeOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [workDone, setWorkDone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );
  const job = React.useMemo(
    () => jobById(member, params.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, params.id, revision, mounted],
  );

  if (!mounted) {
    return <div className="space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }

  if (!job || !member) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-6 text-center">
          <p className="font-heading text-h3 font-semibold text-foreground">Job not found</p>
          <p className="mt-1 text-body text-muted">It may have been reassigned.</p>
          <Button className="mt-4" onClick={() => router.push("/worker/jobs")}>Back to my jobs</Button>
        </Card>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); bump(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/worker/jobs" className="inline-flex min-h-[44px] items-center gap-1 text-body font-medium text-primary">
        <AngleLeft size={18} /> My jobs
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-heading text-h1 font-semibold text-foreground">{job.title}</h1>
            <p className="text-caption text-muted">{job.reference}</p>
          </div>
          <Badge className="border-primary/40 bg-primary/10 text-primary">{STAGE_LABEL[job.stage]}</Badge>
        </div>
        {job.description && (
          <p className="mt-3 rounded-xl bg-surface-hover p-3 text-body text-muted">{job.description}</p>
        )}
      </Card>

      {/* THE AGREED SCOPE — what the customer actually paid for. */}
      {job.quotation && (
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <FileLines size={18} className="text-primary" />
            <h2 className="font-heading text-h3 font-semibold text-foreground">The agreed scope</h2>
          </div>
          <p className="mb-3 text-caption text-muted">
            What the customer accepted and paid for. Anything beyond this needs a separate
            charge they approve first — don&rsquo;t absorb it.
          </p>
          <ul className="divide-y divide-border">
            {job.quotation.lines.map((l, i) => (
              <li key={`${l.itemId}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground">{l.name}</p>
                  <p className="text-caption text-muted">
                    {l.quantity} × {formatUGX(l.unitPriceAtBooking)} {l.unit}
                  </p>
                  {l.description && <p className="text-caption text-muted">{l.description}</p>}
                </div>
                <p className="shrink-0 text-body font-medium text-foreground">
                  {l.excludedFromTotal ? "—" : formatUGX(l.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-body font-medium text-muted">Agreed total</span>
            <span className="font-heading text-h2 font-semibold text-primary">
              {formatUGX(job.quotation.total)}
            </span>
          </div>
        </Card>
      )}

      {/* Maintenance equivalent — the assessment and what was approved. */}
      {job.kind === "maintenance" && (job.assessmentNotes || job.approvedCost != null) && (
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <InfoCircle size={18} className="text-primary" />
            <h2 className="font-heading text-h3 font-semibold text-foreground">What was approved</h2>
          </div>
          {job.assessmentNotes && <p className="mt-2 text-body text-foreground">{job.assessmentNotes}</p>}
          {job.approvedCost != null && (
            <p className="mt-2 text-body text-muted">
              Approved cost{" "}
              <span className="font-heading text-h3 font-semibold text-primary">{formatUGX(job.approvedCost)}</span>
            </p>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Where and when</h2>
        <dl className="space-y-3 text-body">
          <div className="flex items-start gap-2.5">
            <UserCircle size={18} className="mt-0.5 shrink-0 text-muted" />
            <span className="text-foreground">{job.customerName}</span>
          </div>
          {job.customerPhone && (
            <a
              href={`tel:${job.customerPhone.replace(/\s/g, "")}`}
              className="flex min-h-[44px] items-center gap-2.5 text-primary"
            >
              <Phone size={18} className="shrink-0" />
              <span className="font-medium">{job.customerPhone}</span>
              <span className="text-caption text-muted">(tap to call)</span>
            </a>
          )}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-h-[44px] items-start gap-2.5 text-primary"
          >
            <MapPin size={18} className="mt-0.5 shrink-0" />
            <span className="font-medium">{job.address}</span>
          </a>
          {job.scheduledAt && (
            <div className="flex items-start gap-2.5">
              <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
              <span className="text-foreground">{formatDate(job.scheduledAt)}</span>
            </div>
          )}
        </dl>
      </Card>

      {job.stage === "declined" && job.declineReason && (
        <Card className="p-5">
          <p className="text-caption uppercase tracking-wide text-muted">You declined this job</p>
          <p className="mt-1 text-body text-foreground">{job.declineReason}</p>
        </Card>
      )}

      {/* Actions by stage — a worker only ever sees the next legitimate step. */}
      <div className={cn("sticky bottom-20 z-10 space-y-2 lg:bottom-4")}>
        {job.stage === "assigned" && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="min-h-[52px]"
              loading={busy}
              onClick={() => run(() => acceptJob(job.id, member), "Job accepted")}
            >
              Accept job
            </Button>
            <Button variant="outline" className="min-h-[52px]" onClick={() => setDeclineOpen(true)}>
              Decline
            </Button>
          </div>
        )}
        {job.stage === "accepted" && (
          <Button
            className="min-h-[52px] w-full"
            loading={busy}
            onClick={() => run(() => startJob(job.id, member), "Job started")}
          >
            Start job
          </Button>
        )}
        {job.stage === "in_progress" && (
          <div className="space-y-2">
            <Button className="min-h-[52px] w-full" onClick={() => setCompleteOpen(true)}>
              Mark complete
            </Button>
            {job.kind === "service" && (
              <Button variant="outline" className="min-h-[52px] w-full" onClick={() => setChargeOpen(true)}>
                Raise additional charge
              </Button>
            )}
          </div>
        )}
        {job.stage === "completed" && (
          <Card className="p-4 text-center">
            <p className="text-body text-muted">
              Marked complete. Waiting for a manager to confirm.
            </p>
          </Card>
        )}
      </div>

      {/* ---- decline ---- */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this job?</DialogTitle>
            <DialogDescription>{job.reference} · {job.title}</DialogDescription>
          </DialogHeader>
          <Field label="Why can't you take it?" htmlFor="wk-decline" error={reason.trim().length >= 5 ? undefined : "Required"}>
            <Textarea id="wk-decline" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. I'm already booked at that time" />
            <p className="mt-1 text-caption text-muted">
              The office is told straight away and will reassign it.
            </p>
          </Field>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              loading={busy}
              disabled={reason.trim().length < 5}
              onClick={async () => {
                await run(() => declineJob(job.id, member, reason), "Job declined — the office has been told");
                setDeclineOpen(false);
                router.push("/worker/jobs");
              }}
            >
              Decline job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- completion ---- */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark this job complete</DialogTitle>
            <DialogDescription>{job.reference} · {job.title}</DialogDescription>
          </DialogHeader>
          <Field label="What did you do?" htmlFor="wk-done" error={workDone.trim().length >= 5 ? undefined : "Required"}>
            <Textarea id="wk-done" rows={3} value={workDone} onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Describe the work you completed" />
          </Field>
          <Field label="Anything else? (optional)" htmlFor="wk-notes">
            <Textarea id="wk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <p className="rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
            Photo upload — available once file storage is wired in.
          </p>
          <p className="text-caption text-muted">
            A manager reviews and confirms before the customer is told it&rsquo;s done.
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              loading={busy}
              disabled={workDone.trim().length < 5}
              onClick={async () => {
                await run(
                  () => completeJob(job.id, member, { workDone, notes }),
                  "Marked complete — awaiting manager confirmation",
                );
                setCompleteOpen(false);
              }}
            >
              Mark complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RaiseChargeSheet
        open={chargeOpen}
        onOpenChange={setChargeOpen}
        bookingId={job.kind === "service" ? job.id : null}
        raisedBy={member.name}
        onDone={bump}
      />
    </div>
  );
}
