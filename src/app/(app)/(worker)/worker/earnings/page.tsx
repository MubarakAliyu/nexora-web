"use client";

/**
 * SCREEN 3 — EARNINGS & PAYOUTS (F4.3, rebuilt for G1/B2–B3).
 *
 * ON THE "NO WALLET" RULE. F4 shipped this screen deliberately without a
 * balance: the 27 August minutes said "do not add a worker wallet unless
 * separately approved". The client has since asked for balances, withdrawals,
 * payout requests and bank accounts, and the G1 brief grants that approval in
 * terms. This screen is that approval being exercised.
 *
 * What has NOT changed: the balance is derived from completed jobs, never
 * stored; there is no top-up and no transfer; and a request is a request — the
 * office decides. The amount leaves the available balance the moment it is
 * raised, so it cannot be requested twice, and returns if it is cancelled or
 * rejected.
 *
 * Mobile-first: one column at 375, cards side by side from 640, and every
 * control at least 48px tall because this is used one-handed on site.
 */
import * as React from "react";
import Link from "next/link";
import { Wallet, ClipboardList, Cash, CashRegister, ArrowUp, Clock, Receipt } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatCurrency, formatDate } from "@/lib/format";
import { staffForUser } from "@/lib/api/worker";
import { earningsFor } from "@/lib/api/worker-jobs";
import {
  workerBalance, requestsFor, accountsFor, accountById, accountLabel, primaryAccountFor,
  scheduleFor, scheduleText, nextPayoutDate, daysToNextPayout,
  previewFee, payoutBlockedReason, createPayoutRequest, cancelPayoutRequest,
  PAYOUT_STATUS_LABEL,
} from "@/lib/api/payouts";
import type { PayoutRequestStatus } from "@/lib/mock/types";
import { CurrencyCode } from "@/components/app/currency-code";

const STATUS_TONE: Record<PayoutRequestStatus, string> = {
  pending: "border-primary/30 bg-primary/10 text-primary",
  approved: "border-primary/30 bg-primary/10 text-primary",
  paid: "border-border bg-surface-hover text-foreground",
  rejected: "border-border bg-surface-hover text-muted",
  cancelled: "border-border bg-surface-hover text-muted",
};

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <Card className="p-4">
      <p className="text-caption uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-heading text-h2 font-semibold ${tone === "primary" ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </Card>
  );
}

export default function WorkerEarningsPage() {
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"full" | "custom">("full");
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );
  const balance = React.useMemo(
    () => workerBalance(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const earnings = React.useMemo(
    () => earningsFor(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const requests = React.useMemo(
    () => requestsFor(member?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const accounts = React.useMemo(
    () => accountsFor(member?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );

  if (!mounted) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const schedule = scheduleFor(member?.id);
  const blocked = payoutBlockedReason(member);
  const days = daysToNextPayout(schedule);
  const next = nextPayoutDate(schedule);

  const requested = mode === "full" ? balance.available : Number(amount);
  const preview = previewFee(Number.isFinite(requested) && requested > 0 ? requested : 0, member?.id);
  const amountValid =
    Number.isFinite(requested) &&
    requested > 0 &&
    requested <= balance.available &&
    requested >= schedule.minimumPayout;
  const canSubmit = amountValid && !!accountId;

  const openDialog = () => {
    setMode("full");
    setAmount(String(balance.available));
    setAccountId(primaryAccountFor(member?.id)?.id ?? accounts[0]?.id ?? "");
    setOpen(true);
  };

  const submit = async () => {
    if (!member || !canSubmit) return;
    setBusy(true);
    try {
      const r = await createPayoutRequest({ member, amount: requested, accountId });
      toast.success("Payout requested", {
        description: `${r.reference} — ${formatCurrency(r.amountRequested, r.currency, { rateAtCreation: r.exchangeRateAtCreation })} requested. The office has been notified.`,
      });
      setOpen(false);
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t request a payout");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      const r = await cancelPayoutRequest(id, user?.name ?? "Worker");
      toast.success("Request cancelled", {
        description: `${formatCurrency(r.amountRequested, r.currency, { rateAtCreation: r.exchangeRateAtCreation })} is back in your available balance.`,
      });
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t cancel the request");
    } finally {
      setCancelling(null);
    }
  };

  const m = (n: number) => formatCurrency(n, balance.currency);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-h1 font-semibold text-foreground">Earnings</h1>
        <p className="mt-1 text-caption text-muted">
          What your completed jobs have earned, and what you can withdraw. Worker rates pending stakeholder confirmation.
        </p>
      </div>

      {/* B2 — five figures. Available balance is the headline; the other four
          explain how it was arrived at. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5 sm:col-span-2">
          <p className="text-caption uppercase tracking-wide text-muted">Available balance</p>
          <p className="mt-1 font-heading text-hero font-semibold leading-none text-primary">{m(balance.available)}</p>
          <p className="mt-2 text-caption text-muted">Earned, minus what you have been paid and what is already requested.</p>
        </Card>
        <StatTile label="Total earned" value={m(balance.totalEarned)} />
        <StatTile label="Withdrawn" value={m(balance.withdrawn)} />
        <StatTile label="Pending requests" value={m(balance.pending)} />
        <StatTile label="Fees deducted" value={m(balance.feesDeducted)} />
      </div>

      {/* B2 — next payout, and the one control that matters on this screen. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-caption uppercase tracking-wide text-muted">
              <Clock size={16} /> Next payout
            </p>
            <p className="mt-1 font-heading text-h2 font-semibold text-foreground">
              {days == null ? "On demand" : days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}
            </p>
            <p className="mt-1 text-caption text-muted">
              {scheduleText(schedule)}
              {next ? ` · ${formatDate(next)}` : ""}
            </p>
            <p className="mt-1 text-caption text-muted">
              Minimum {m(schedule.minimumPayout)} · processing fee {schedule.processingFeePercent}%
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <Button
              className="min-h-[52px] w-full sm:w-auto"
              onClick={openDialog}
              disabled={!!blocked}
              title={blocked ?? undefined}
            >
              <Cash size={18} /> Request payout
            </Button>
          </div>
        </div>
        {blocked && (
          <p key={blocked} className="mt-3 rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted motion-safe:animate-in motion-safe:fade-in">
            {blocked}
            {accounts.length === 0 && (
              <>
                {" "}
                <Link href="/worker/profile" className="font-medium text-primary underline underline-offset-4">
                  Add one on your profile
                </Link>
                .
              </>
            )}
          </p>
        )}
      </Card>

      {/* B3 — the requests themselves, newest first, cancellable while pending. */}
      <section aria-labelledby="req-h">
        <h2 id="req-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">Payout requests</h2>
        {requests.length === 0 ? (
          <EmptyState icon={<Wallet size={22} />} title="No payout requests yet"
            description="When you request a payout it will appear here with its status." />
        ) : (
          <Card className="divide-y divide-border">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-foreground">
                    {formatCurrency(r.amountRequested, r.currency, { rateAtCreation: r.exchangeRateAtCreation })}
                    <span className="ml-2 text-caption font-normal text-muted">
                      net {formatCurrency(r.netAmount, r.currency, { rateAtCreation: r.exchangeRateAtCreation })}
                    </span>
                  </p>
                  <p className="text-caption text-muted">
                    {/* ⚠️ masked — never a full account number outside the edit form. */}
                    {r.reference} · {formatDate(r.requestedAt)} · {accountLabel(accountById(r.accountId))}
                  </p>
                  {r.rejectionReason && (
                    <p className="mt-1 text-caption text-muted">Reason: {r.rejectionReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={STATUS_TONE[r.status]}>{PAYOUT_STATUS_LABEL[r.status]}</Badge>
                  {r.status === "pending" && (
                    <Button variant="outline" size="sm" loading={cancelling === r.id} onClick={() => cancel(r.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section aria-labelledby="earn-h">
        <h2 id="earn-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">Earnings breakdown</h2>
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
                    {e.payoutId ? " · paid out" : " · counted in your balance"}
                  </p>
                </div>
                <p className="shrink-0 font-heading text-h3 font-semibold text-foreground">
                  {formatCurrency(e.amount, e.currency, { rateAtCreation: e.exchangeRateAtCreation })}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* B3 — request flow. Full balance in one tap, or a specific amount. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a payout</DialogTitle>
            <DialogDescription>
              {m(balance.available)} available. Minimum {m(schedule.minimumPayout)}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant={mode === "full" ? "primary" : "outline"}
              className="min-h-[48px] justify-start gap-2"
              onClick={() => { setMode("full"); setAmount(String(balance.available)); }}
            >
              <ArrowUp size={18} /> Full balance
            </Button>
            <Button
              variant={mode === "custom" ? "primary" : "outline"}
              className="min-h-[48px] justify-start gap-2"
              onClick={() => setMode("custom")}
            >
              <CashRegister size={18} /> A specific amount
            </Button>
          </div>

          {mode === "custom" && (
            <Field
              key="custom-amount"
              label={<>Amount (<CurrencyCode />)</>}
              htmlFor="po-amt"
              error={amountValid ? undefined : `Enter between ${m(schedule.minimumPayout)} and ${m(balance.available)}`}
            >
              <Input
                id="po-amt" type="number" min={schedule.minimumPayout} max={balance.available}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="min-h-[48px]"
              />
            </Field>
          )}

          <Field label="Pay into" htmlFor="po-acct">
            <select id="po-acct" className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.length === 0 && <option value="">No account on file</option>}
              {accounts.map((a) => (
                // ⚠️ masked — the full number only ever appears in the edit form.
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}{a.isPrimary ? " · default" : ""}
                </option>
              ))}
            </select>
          </Field>

          {/* Live fee preview — the worker sees the net before they commit. */}
          <div className="rounded-xl border border-border bg-surface-hover p-3">
            <dl className="space-y-1 text-caption">
              <div className="flex justify-between"><dt className="text-muted">You requested</dt><dd className="text-foreground">{m(preview.requested)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Processing fee ({preview.feePercent}%)</dt><dd className="text-foreground">−{m(preview.fee)}</dd></div>
              <div className="flex justify-between border-t border-border pt-1 font-medium">
                <dt className="text-foreground">You receive</dt><dd className="text-primary">{m(preview.net)}</dd>
              </div>
            </dl>
          </div>

          <p className="flex items-start gap-2 text-caption text-muted">
            <Receipt size={16} className="mt-0.5 shrink-0" />
            This is a request, not a transfer. The amount leaves your available balance now and comes back if it is
            cancelled or not approved.
          </p>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button loading={busy} disabled={!canSubmit} onClick={submit}>Request payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
