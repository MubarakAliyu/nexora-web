"use client";

/**
 * WORKER PAYOUTS (G1/B5).
 *
 * The admin side of the payout ledger: what workers have asked for, what has
 * been approved, what has been paid, and the schedule everyone is paid on.
 *
 * ⚠️ Account numbers are MASKED here as everywhere else. The detail dialog shows
 * the destination so finance can tell where money is going, never the full
 * number — that lives only in the worker's own edit form.
 *
 * ⚠️ Approving and paying a worker does NOT touch owner settlements. A payout is
 * a Nexora operating cost; nothing in this flow writes an expense, an owner or
 * an agreement. See the note at the top of `lib/api/payouts.ts`.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, Cash, CheckCircle, CloseCircle, Clock, Cog, ExclamationCircle,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, selectClass } from "@/components/forms/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatCurrency, formatCurrencyRecordedFull, formatDate } from "@/lib/format";
import { MoneyStat } from "@/components/app/money";
import * as db from "@/lib/mock/db";
import {
  listPayoutRequests, getPayoutKpis, accountById, accountLabel,
  approvePayoutRequest, rejectPayoutRequest, markPayoutPaid, bulkApprovePayouts,
  savePayoutSchedule, scheduleFor, globalSchedule, scheduleText, hasScheduleOverride,
  PAYOUT_STATUS_LABEL, PAYOUT_FREQUENCY_LABEL,
} from "@/lib/api/payouts";
import type { PayoutRequest, PayoutRequestStatus, PayoutFrequency } from "@/lib/mock/types";

const STATUS_TONE: Record<PayoutRequestStatus, string> = {
  pending: "border-primary/30 bg-primary/10 text-primary",
  approved: "border-primary/30 bg-primary/10 text-primary",
  paid: "border-border bg-surface-hover text-foreground",
  rejected: "border-border bg-surface-hover text-muted",
  cancelled: "border-border bg-surface-hover text-muted",
};

const STATUSES: (PayoutRequestStatus | "all")[] = ["all", "pending", "approved", "paid", "rejected", "cancelled"];

export default function AdminPayoutsPage() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const actor = user?.name ?? "Admin";

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<PayoutRequestStatus | "all">("all");
  const [staffId, setStaffId] = React.useState<string>("all");
  const [detail, setDetail] = React.useState<PayoutRequest | null>(null);
  const [rejecting, setRejecting] = React.useState<PayoutRequest | null>(null);
  const [reason, setReason] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  /* G1/B5 — payouts move money out of Nexora, so the queue is Super Admin and
     Finance Officer only. The nav already hides it; this stops a typed URL. */
  const allowed = user?.role === "super_admin" || user?.role === "finance_officer";
  React.useEffect(() => {
    if (user && !allowed) router.replace("/admin");
  }, [user, allowed, router]);

  const rows = useAsync(
    () => listPayoutRequests({ q, status, staffId, forceError: debugErrorFlag() }),
     
    [q, status, staffId, revision],
  );
  const kpis = useAsync(
    () => getPayoutKpis(),
     
    [revision],
  );

  const workers = React.useMemo(
    () => db.staff.filter((s) => s.hasPortalAccess),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  if (!allowed) return null;

  const list = rows.data ?? [];
  const pendingIds = list.filter((r) => r.status === "pending").map((r) => r.id);
  const chosen = selected.filter((id) => pendingIds.includes(id));

  const m = (r: PayoutRequest, n: number) =>
    formatCurrency(n, r.currency, { rateAtCreation: r.exchangeRateAtCreation });

  const run = async (fn: () => Promise<unknown>, ok: string, description?: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok, description ? { description } : undefined);
      setDetail(null);
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<PayoutRequest>[] = [
    { key: "reference", header: "Reference", render: (r) => <span className="font-medium text-foreground">{r.reference}</span> },
    { key: "staffName", header: "Worker" },
    { key: "amountRequested", header: "Requested", render: (r) => m(r, r.amountRequested) },
    { key: "fee", header: "Fee", render: (r) => m(r, r.fee) },
    { key: "netAmount", header: "Net", render: (r) => <span className="font-medium text-foreground">{m(r, r.netAmount)}</span> },
    {
      key: "accountId", header: "Destination",
      // ⚠️ masked — a table is exported and screenshotted.
      render: (r) => <span className="text-muted">{accountLabel(accountById(r.accountId))}</span>,
    },
    { key: "requestedAt", header: "Requested on", render: (r) => formatDate(r.requestedAt) },
    { key: "status", header: "Status", render: (r) => <Badge className={STATUS_TONE[r.status]}>{PAYOUT_STATUS_LABEL[r.status]}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Worker Payouts"
        subtitle="Requests from workers to be paid what their completed jobs earned"
        actions={
          <ExportCsvButton
            filename="worker-payouts"
            data={list}
            columns={[
              { header: "Reference", accessor: (r) => r.reference },
              { header: "Worker", accessor: (r) => r.staffName },
              { header: "Requested", accessor: (r) => r.amountRequested },
              { header: "Fee", accessor: (r) => r.fee },
              { header: "Net", accessor: (r) => r.netAmount },
              // ⚠️ masked in the export too — this file leaves the building.
              { header: "Destination", accessor: (r) => accountLabel(accountById(r.accountId)) },
              { header: "Status", accessor: (r) => PAYOUT_STATUS_LABEL[r.status] },
              { header: "Requested on", accessor: (r) => r.requestedAt },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting approval" icon={<Clock size={20} />}
          value={<MoneyStat value={kpis.data?.pendingAmount ?? 0} />}
          hint={`${kpis.data?.pendingCount ?? 0} request${kpis.data?.pendingCount === 1 ? "" : "s"}`} />
        <StatCard label="Approved, unpaid" icon={<CheckCircle size={20} />}
          value={<MoneyStat value={kpis.data?.approvedAmount ?? 0} />}
          hint={`${kpis.data?.approvedCount ?? 0} to pay out`} />
        <StatCard label="Paid this month" icon={<Cash size={20} />}
          value={<MoneyStat value={kpis.data?.paidThisMonth ?? 0} />}
          hint="net to workers" />
        <StatCard label="Processing fees" icon={<Wallet size={20} />}
          value={<MoneyStat value={kpis.data?.feesEarned ?? 0} />}
          hint="retained by Nexora" />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Requests</TabsTrigger>
          <TabsTrigger value="schedule">Payout schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference or worker…" aria-label="Search payouts" className="h-10" />
            <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as PayoutRequestStatus | "all")} aria-label="Status">
              {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : PAYOUT_STATUS_LABEL[s]}</option>)}
            </select>
            <select className={selectClass} value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Worker">
              <option value="all">All workers</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {chosen.length > 0 && (
              <Button key="bulk" loading={busy} className="gap-2 motion-safe:animate-in motion-safe:fade-in"
                onClick={() => run(
                  async () => { const n = await bulkApprovePayouts(chosen, actor); setSelected([]); return n; },
                  `${chosen.length} request${chosen.length === 1 ? "" : "s"} approved`,
                )}>
                <CheckCircle size={18} /> Approve {chosen.length} selected
              </Button>
            )}
          </div>

          {rows.error ? (
            <EmptyState icon={<ExclamationCircle size={22} />} title="Couldn’t load payout requests" description={rows.error}
              action={<Button variant="outline" size="sm" onClick={rows.reload}>Try again</Button>} />
          ) : list.length === 0 && !rows.loading ? (
            <EmptyState icon={<Wallet size={22} />} title="No payout requests" description="When a worker requests a payout it lands here." />
          ) : (
            <>
              {pendingIds.length > 0 && (
                <label className="mb-2 flex items-center gap-2 text-caption text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={chosen.length === pendingIds.length && pendingIds.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? pendingIds : [])}
                  />
                  Select all {pendingIds.length} pending
                </label>
              )}
              <DataTable
                data={list}
                loading={rows.loading}
                columns={[
                  {
                    key: "select", header: "",
                    render: (r) => r.status === "pending" ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--primary)]"
                        checked={selected.includes(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSelected((s) => e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id))}
                        aria-label={`Select ${r.reference}`}
                      />
                    ) : null,
                  },
                  ...columns,
                ]}
                getRowId={(r) => r.id}
                onRowClick={(r) => setDetail(r)}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <SchedulePanel workers={workers} actor={actor} onSaved={bump} />
        </TabsContent>
      </Tabs>

      {/* Detail + decision */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detail.reference}
                  <Badge className={STATUS_TONE[detail.status]}>{PAYOUT_STATUS_LABEL[detail.status]}</Badge>
                </DialogTitle>
                <DialogDescription>{detail.staffName} · requested {formatDate(detail.requestedAt)}</DialogDescription>
              </DialogHeader>

              <dl className="divide-y divide-border rounded-xl border border-border">
                <div className="flex justify-between p-3"><dt className="text-muted">Requested</dt><dd className="text-foreground">{m(detail, detail.amountRequested)}</dd></div>
                <div className="flex justify-between p-3"><dt className="text-muted">Processing fee</dt><dd className="text-foreground">−{m(detail, detail.fee)}</dd></div>
                <div className="flex justify-between p-3 font-medium"><dt className="text-foreground">Net to worker</dt><dd className="text-primary">{m(detail, detail.netAmount)}</dd></div>
                {/* ⚠️ masked. */}
                <div className="flex justify-between p-3"><dt className="text-muted">Destination</dt><dd className="text-foreground">{accountLabel(accountById(detail.accountId))}</dd></div>
                {detail.decidedBy && (
                  <div className="flex justify-between p-3"><dt className="text-muted">Decided by</dt><dd className="text-foreground">{detail.decidedBy} · {formatDate(detail.decidedAt ?? detail.requestedAt)}</dd></div>
                )}
                {detail.paidBy && (
                  <div className="flex justify-between p-3"><dt className="text-muted">Paid by</dt><dd className="text-foreground">{detail.paidBy} · {formatDate(detail.paidAt ?? detail.requestedAt)}</dd></div>
                )}
                {detail.rejectionReason && (
                  <div className="p-3"><dt className="text-muted">Reason</dt><dd className="mt-1 text-foreground">{detail.rejectionReason}</dd></div>
                )}
              </dl>

              <p className="rounded-xl border border-border bg-surface-hover p-3 text-caption text-muted">
                A worker payout is a Nexora cost. It does not affect any owner settlement.
              </p>

              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                {detail.status === "pending" && (
                  <>
                    <Button variant="outline" onClick={() => { setReason(""); setRejecting(detail); }}>
                      <CloseCircle size={18} /> Reject
                    </Button>
                    <Button loading={busy} onClick={() => run(
                      () => approvePayoutRequest(detail.id, actor),
                      "Payout approved",
                      `${detail.reference} — ${m(detail, detail.amountRequested)} to ${detail.staffName}.`,
                    )}>
                      <CheckCircle size={18} /> Approve
                    </Button>
                  </>
                )}
                {detail.status === "approved" && (
                  <>
                    <Button variant="outline" onClick={() => { setReason(""); setRejecting(detail); }}>
                      <CloseCircle size={18} /> Reject
                    </Button>
                    <Button loading={busy} onClick={() => run(
                      () => markPayoutPaid(detail.id, actor),
                      "Payout marked as paid",
                      `${m(detail, detail.netAmount)} sent to ${detail.staffName}.`,
                    )}>
                      <Cash size={18} /> Mark as paid
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection needs a reason — the worker reads it. */}
      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) setRejecting(null); }}>
        <DialogContent>
          {rejecting && (
            <>
              <DialogHeader>
                <DialogTitle>Reject {rejecting.reference}?</DialogTitle>
                <DialogDescription>
                  {formatCurrency(rejecting.amountRequested, rejecting.currency, { rateAtCreation: rejecting.exchangeRateAtCreation })} returns
                  to {rejecting.staffName}&rsquo;s available balance. They see the reason you give.
                </DialogDescription>
              </DialogHeader>
              <Field label="Reason" htmlFor="rej-reason" error={reason.trim() ? undefined : "Give a reason — the worker sees it"}>
                <Textarea id="rej-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button loading={busy} disabled={!reason.trim()} onClick={() => run(
                  async () => { await rejectPayoutRequest(rejecting.id, reason, actor); setRejecting(null); },
                  "Payout rejected",
                  `${rejecting.staffName} has been notified.`,
                )}>
                  Reject request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------- schedule configuration */

/**
 * The global default plus per-worker overrides (B5).
 *
 * Save-owned, like the F3 approval threshold and the G1/A1 exchange rate: a
 * half-typed minimum must never become policy the moment focus leaves a field.
 */
function SchedulePanel({
  workers, actor, onSaved,
}: {
  workers: { id: string; name: string }[];
  actor: string;
  onSaved: () => void;
}) {
  const [target, setTarget] = React.useState<string>("global");
  const staffId = target === "global" ? null : target;
  const committed = staffId ? scheduleFor(staffId) : globalSchedule();

  const [frequency, setFrequency] = React.useState<PayoutFrequency>(committed.frequency);
  const [payoutDay, setPayoutDay] = React.useState(String(committed.payoutDay));
  const [minimum, setMinimum] = React.useState(String(committed.minimumPayout));
  const [fee, setFee] = React.useState(String(committed.processingFeePercent));
  const [busy, setBusy] = React.useState(false);

  // Reload the fields when the admin points at a different worker.
  React.useEffect(() => {
    const s = staffId ? scheduleFor(staffId) : globalSchedule();
    setFrequency(s.frequency);
    setPayoutDay(String(s.payoutDay));
    setMinimum(String(s.minimumPayout));
    setFee(String(s.processingFeePercent));
  }, [staffId]);

  const dayN = Number(payoutDay);
  const minN = Number(minimum);
  const feeN = Number(fee);
  const dayValid = Number.isFinite(dayN) && dayN >= 1 && dayN <= (frequency === "monthly" ? 28 : 7);
  const valid = dayValid && Number.isFinite(minN) && minN >= 0 && Number.isFinite(feeN) && feeN >= 0 && feeN <= 100;
  const dirty =
    frequency !== committed.frequency ||
    dayN !== committed.payoutDay ||
    minN !== committed.minimumPayout ||
    feeN !== committed.processingFeePercent;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const row = await savePayoutSchedule(
        { staffId, frequency, payoutDay: dayN, minimumPayout: minN, processingFeePercent: feeN },
        actor,
      );
      toast.success("Payout schedule saved", { description: scheduleText(row) });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t save the schedule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="mb-1 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground">
        <Cog size={20} /> Payout schedule
      </h2>
      <p className="mb-4 text-caption text-muted">
        The default applies to every worker. An override replaces it for one person — a contractor paid monthly, say.
        Frequency and fee pending stakeholder confirmation.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Applies to" htmlFor="ps-target">
          <select id="ps-target" className={selectClass} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="global">All workers (default)</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}{hasScheduleOverride(w.id) ? " · override" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Frequency" htmlFor="ps-freq">
          <select id="ps-freq" className={selectClass} value={frequency} onChange={(e) => setFrequency(e.target.value as PayoutFrequency)}>
            {(Object.keys(PAYOUT_FREQUENCY_LABEL) as PayoutFrequency[]).map((f) => (
              <option key={f} value={f}>{PAYOUT_FREQUENCY_LABEL[f]}</option>
            ))}
          </select>
        </Field>
        {frequency !== "on_demand" && (
          <Field
            key="ps-day-field"
            label={frequency === "monthly" ? "Day of month (1–28)" : "Day of week (1 = Monday)"}
            htmlFor="ps-day"
            error={dayValid ? undefined : "Out of range"}
          >
            <Input id="ps-day" type="number" min={1} max={frequency === "monthly" ? 28 : 7} value={payoutDay} onChange={(e) => setPayoutDay(e.target.value)} />
          </Field>
        )}
        <Field label="Minimum payout (UGX)" htmlFor="ps-min" error={Number.isFinite(minN) && minN >= 0 ? undefined : "Enter an amount"}>
          <Input id="ps-min" type="number" min={0} step={10_000} value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </Field>
        <Field label="Processing fee (%)" htmlFor="ps-fee" error={Number.isFinite(feeN) && feeN >= 0 && feeN <= 100 ? undefined : "0–100"}>
          <Input id="ps-fee" type="number" min={0} max={100} step={0.5} value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
      </div>

      {dirty && (
        <p key="ps-dirty" className="mt-3 text-caption font-medium text-primary motion-safe:animate-in motion-safe:fade-in">
          Unsaved — currently {scheduleText(committed).toLowerCase()}, minimum {formatCurrencyRecordedFull(committed.minimumPayout)}, fee {committed.processingFeePercent}%.
        </p>
      )}
      <p className="mt-1 text-caption text-muted">
        Last updated {formatDate(committed.updatedAt)} by {committed.updatedBy}.
      </p>

      <Button className="mt-4" loading={busy} disabled={!valid || !dirty} onClick={save}>Save schedule</Button>
    </Card>
  );
}
