"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileDoc, PenNib, CloseCircle, Cash, ChartLineUp, Receipt, UserCircle, Clock, CheckCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { AgreementFormDialog } from "@/components/admin/agreement-form-dialog";
import { TerminateAgreementDialog } from "@/components/admin/terminate-agreement-dialog";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate, fromNow } from "@/lib/format";
import { NOW_ISO } from "@/lib/api/admin";
import {
  fetchAgreementById, fetchAgreementFinancials, agreementRateLabel, CONTRACT_TYPE_LABEL,
  type ManagementAgreement,
} from "@/lib/api/agreements";

const SCHED_LABEL: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", on_demand: "On Demand" };
const mask = (acc?: string) => (acc && acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc ?? "—");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-body text-muted">{label}</dt>
      <dd className="text-right text-body font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function AgreementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => fetchAgreementById(params.id), [params.id, scope]);
  const fin = useAsync(() => fetchAgreementFinancials(params.id), [params.id, scope]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [terminating, setTerminating] = React.useState<ManagementAgreement | null>(null);

  if (loading) return <div><Skeleton className="h-6 w-48" /><Skeleton className="mt-4 h-40 w-full rounded-xl" /><SkeletonText className="mt-6" lines={3} /></div>;
  if (error || !data) {
    return <EmptyState icon={<FileDoc size={22} />} title="Agreement not found" description={error ?? "This agreement couldn’t be loaded."}
      action={<Button variant="outline" onClick={() => router.push("/admin/agreements")}>Back to agreements</Button>} />;
  }

  const a = data;
  const isActive = a.status === "active";

  return (
    <div>
      <PageHeader
        title={`${a.ownerName} — ${CONTRACT_TYPE_LABEL[a.contractType]}`}
        subtitle="Management agreement"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}><PenNib size={18} /> Edit</Button>
            {isActive && <Button variant="outline" className="gap-2" onClick={() => setTerminating(a)}><CloseCircle size={18} /> Terminate</Button>}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Terms */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={a.contractType === "revenue_sharing" ? "default" : a.contractType === "fixed_fee" ? "accent" : "muted"}>{CONTRACT_TYPE_LABEL[a.contractType]}</Badge>
            <StatusBadge status={a.status} />
          </div>
          <p className="font-heading text-hero font-semibold leading-none text-primary">{agreementRateLabel(a)}</p>
          <p className="mt-1 text-caption text-muted">Commission / fee rate</p>

          <dl className="mt-4 divide-y divide-border border-t border-border">
            <Row label="Owner"><Link href={`/admin/owners/${a.ownerId}`} className="text-primary hover:text-accent">{a.ownerName}</Link></Row>
            <Row label="Effective period">{formatDate(a.effectiveDate)} → {formatDate(a.expiryDate)}</Row>
            <Row label="Settlement schedule"><Badge variant="muted">{SCHED_LABEL[a.settlementSchedule]}</Badge></Row>
            <Row label="Payout bank">{a.payoutBankName ?? "—"}</Row>
            <Row label="Payout account">{a.payoutAccountName ? `${a.payoutAccountName} · ${mask(a.payoutAccountNumber)}` : mask(a.payoutAccountNumber)}</Row>
            {a.notes && <Row label="Notes"><span className="max-w-xs text-right font-normal text-muted">{a.notes}</span></Row>}
            <Row label="Created">{formatDate(a.createdAt)}</Row>
            <Row label="Last updated">{formatDate(a.updatedAt)}</Row>
          </dl>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Agreement events</h2>
          <Timeline>
            <TimelineItem title="Agreement created" time={fromNow(a.createdAt, NOW_ISO)} icon={<CheckCircle size={11} />}>
              <span className="text-caption text-muted">{CONTRACT_TYPE_LABEL[a.contractType]}, {agreementRateLabel(a)}</span>
            </TimelineItem>
            {a.updatedAt !== a.createdAt && (
              <TimelineItem title="Terms updated" time={fromNow(a.updatedAt, NOW_ISO)} icon={<Clock size={11} />} />
            )}
            {a.status === "terminated" && <TimelineItem title="Agreement terminated" time={fromNow(a.updatedAt, NOW_ISO)} icon={<CloseCircle size={11} />} />}
            {a.status === "expired" && <TimelineItem title="Agreement expired" time={fromNow(a.expiryDate, NOW_ISO)} icon={<Clock size={11} />} />}
          </Timeline>
        </Card>
      </div>

      {/* Financial summary — calculated from real payment data */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-heading text-h3 font-semibold text-foreground">Financial summary</h2>
          <span className="text-caption text-muted">calculated from payments under this agreement</span>
        </div>
        {fin.loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-28" /></Card>)}</div>
        ) : fin.data ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total revenue managed" value={formatUGX(fin.data.grossRevenue)} icon={<Cash size={22} />} />
              <StatCard label="Commission earned" value={formatUGX(fin.data.commissionEarned)} icon={<ChartLineUp size={22} />} hint={`per ${CONTRACT_TYPE_LABEL[a.contractType].toLowerCase()}`} />
              <StatCard label="Property expenses" value={formatUGX(fin.data.expenses)} icon={<Receipt size={22} />} />
              <StatCard label="Net to owner" value={formatUGX(fin.data.netToOwner)} icon={<Cash size={22} />} hint="gross − fee − expenses" />
            </div>
            <Card className="mt-4 p-6">
              <p className="text-caption font-medium uppercase tracking-wide text-muted">How the commission is calculated</p>
              <p className="mt-2 text-body text-foreground">
                {a.contractType === "revenue_sharing"
                  ? `${a.commissionPercentage}% of ${formatUGX(fin.data.grossRevenue)} gross revenue = ${formatUGX(fin.data.commissionEarned)}.`
                  : a.contractType === "fixed_fee"
                    ? `Fixed ${agreementRateLabel(a)} accrued over the agreement period = ${formatUGX(fin.data.commissionEarned)}.`
                    : `Base fee + ${a.hybridPercentage}% of gross revenue = ${formatUGX(fin.data.commissionEarned)}.`}
                {" "}After the fee and {formatUGX(fin.data.expenses)} property expenses, {formatUGX(fin.data.netToOwner)} is net to the owner.
              </p>
            </Card>
          </>
        ) : (
          <EmptyState icon={<UserCircle size={22} />} title="No financials" description={fin.error ?? "No payment data under this agreement yet."} />
        )}
      </section>

      <div className="mt-8"><Link href="/admin/agreements" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to agreements</Link></div>

      <AgreementFormDialog open={editOpen} onOpenChange={setEditOpen} editing={a} onDone={reload} />
      <TerminateAgreementDialog agreement={terminating} onOpenChange={(o) => !o && setTerminating(null)} onDone={reload} />
    </div>
  );
}
