"use client";

/**
 * SCREEN 3 — EARNINGS (F4.3).
 *
 * ⚠️ NOT A WALLET. The 27 Aug minutes: "Do not add a worker wallet unless
 * separately approved." Nothing here is a spendable balance — it is a record of
 * what completed jobs earned and what has been paid out against them. There is
 * no top-up, no transfer, no stored value. A contractor can ASK to be paid what
 * they have already earned; that request goes to an admin.
 */
import * as React from "react";
import { Wallet, ClipboardList, Cash } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  earningsFor, payoutsFor, earningsSummary, availableBalance, canRequestPayout, requestPayout,
} from "@/lib/api/worker-jobs";
import type { PayoutStatus } from "@/lib/mock/types";

const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
};

export default function WorkerEarningsPage() {
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("Mobile Money");
  const [busy, setBusy] = React.useState(false);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );
  const summary = React.useMemo(
    () => earningsSummary(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const earnings = React.useMemo(
    () => earningsFor(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const payouts = React.useMemo(
    () => payoutsFor(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );

  if (!mounted) {
    return <div className="space-y-3"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></div>;
  }

  const available = availableBalance(member);
  const canRequest = canRequestPayout(member);
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= available;

  const submit = async () => {
    if (!member || !valid) return;
    setBusy(true);
    try {
      const p = await requestPayout(member, parsed, method);
      toast.success("Payout requested", { description: `${p.reference} — ${formatUGX(p.amount)}. The office has been notified.` });
      setOpen(false); setAmount(""); bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't request a payout");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-h1 font-semibold text-foreground">Earnings</h1>
        <p className="mt-1 text-caption text-muted">
          A record of what you&rsquo;ve earned and been paid. Worker rates pending stakeholder confirmation.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-caption uppercase tracking-wide text-muted">Earned this month</p>
          <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatUGX(summary.earnedThisMonth)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-caption uppercase tracking-wide text-muted">Not yet paid</p>
          <p className="mt-1 font-heading text-h2 font-semibold text-primary">{formatUGX(summary.pendingPayout)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-caption uppercase tracking-wide text-muted">Paid to date</p>
          <p className="mt-1 font-heading text-h2 font-semibold text-foreground">{formatUGX(summary.totalPaid)}</p>
        </Card>
      </div>

      {canRequest && (
        <Button className="min-h-[52px] w-full sm:w-auto" onClick={() => { setAmount(String(available)); setOpen(true); }}>
          <Cash size={18} /> Request payout
        </Button>
      )}

      <section aria-labelledby="earn-h">
        <h2 id="earn-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">Completed jobs</h2>
        {earnings.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title="No earnings yet"
            description="Completed jobs will appear here with what each one earned." />
        ) : (
          <Card className="divide-y divide-border">
            {earnings.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-foreground">{e.description}</p>
                  <p className="text-caption text-muted">
                    {e.reference} · {formatDate(e.earnedAt)}
                    {e.payoutId ? " · paid out" : " · awaiting payout"}
                  </p>
                </div>
                <p className="shrink-0 font-heading text-h3 font-semibold text-foreground">{formatUGX(e.amount)}</p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section aria-labelledby="pay-h">
        <h2 id="pay-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">Payout history</h2>
        {payouts.length === 0 ? (
          <EmptyState icon={<Wallet size={22} />} title="No payouts yet" />
        ) : (
          <Card className="divide-y divide-border">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground">{formatUGX(p.amount)}</p>
                  <p className="text-caption text-muted">
                    {p.reference} · {formatDate(p.processedAt ?? p.requestedAt)}
                    {p.methodNote ? ` · ${p.methodNote}` : ""}
                  </p>
                </div>
                <Badge className="shrink-0 border-border bg-surface-hover text-muted">{PAYOUT_LABEL[p.status]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a payout</DialogTitle>
            <DialogDescription>Up to {formatUGX(available)} available.</DialogDescription>
          </DialogHeader>
          <Field label="Amount (UGX)" htmlFor="po-amt" error={valid ? undefined : `Enter an amount up to ${formatUGX(available)}`}>
            <Input id="po-amt" type="number" min={0} max={available} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="How would you like to be paid?" htmlFor="po-method">
            <Input id="po-method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. Mobile Money" />
          </Field>
          <p className="rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
            This is a request, not a transfer. The office reviews and processes it.
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button loading={busy} disabled={!valid} onClick={submit}>Request payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
