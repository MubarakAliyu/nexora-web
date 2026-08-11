"use client";

import * as React from "react";
import Link from "next/link";
import { FileDoc, Cash, CalendarMonth, Landmark } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Reveal } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatDate } from "@/lib/format";
import { whatsappHref } from "@/content/site";
import { fetchAgreementByOwner, agreementRateLabel, CONTRACT_TYPE_LABEL } from "@/lib/api/agreements";

const SCHED_LABEL: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", on_demand: "On Demand" };
const mask = (acc?: string) => (acc && acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc ?? "—");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-body text-muted">{label}</dt>
      <dd className="text-right text-body font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function OwnerAgreementPage() {
  const ownerId = useSession((s) => s.user?.ownerId) ?? "";
  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => fetchAgreementByOwner(ownerId, scope), [ownerId, scope]);

  if (loading) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-64 w-full rounded-xl" /><SkeletonText className="mt-6" lines={2} /></div>;
  }

  return (
    <div>
      <PageHeader title="My Agreement" subtitle="Your management agreement with Nexora" />

      {error ? (
        <EmptyState icon={<FileDoc size={22} />} title="Couldn’t load your agreement" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : !data ? (
        <EmptyState
          icon={<FileDoc size={22} />}
          title="No active management agreement found"
          description="Please contact Nexora to set up your management agreement."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/contact">Contact Nexora</Link></Button>
              <Button asChild variant="outline"><a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp us</a></Button>
            </div>
          }
        />
      ) : (
        <Reveal>
          <Card className="mx-auto max-w-2xl p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.contractType === "revenue_sharing" ? "default" : data.contractType === "fixed_fee" ? "accent" : "muted"}>
                {CONTRACT_TYPE_LABEL[data.contractType]}
              </Badge>
              <StatusBadge status={data.status} />
            </div>

            <p className="mt-5 font-heading text-hero font-semibold leading-none text-primary">{agreementRateLabel(data)}</p>
            <p className="mt-1 text-caption text-muted">Your commission / fee rate</p>

            <dl className="mt-6 divide-y divide-border border-t border-border">
              <Row label="Contract type">{CONTRACT_TYPE_LABEL[data.contractType]}</Row>
              <Row label="Effective period"><span className="inline-flex items-center gap-1.5"><CalendarMonth size={15} className="text-muted" /> {formatDate(data.effectiveDate)} → {formatDate(data.expiryDate)}</span></Row>
              <Row label="Settlement schedule"><Badge variant="muted">{SCHED_LABEL[data.settlementSchedule]}</Badge></Row>
              <Row label="Payout bank"><span className="inline-flex items-center gap-1.5"><Landmark size={15} className="text-muted" /> {data.payoutBankName ?? "—"}</span></Row>
              <Row label="Payout account">{data.payoutAccountName ? `${data.payoutAccountName} · ${mask(data.payoutAccountNumber)}` : mask(data.payoutAccountNumber)}</Row>
              {data.notes && <Row label="Notes"><span className="max-w-xs text-right font-normal text-muted">{data.notes}</span></Row>}
            </dl>

            <div className="mt-6 flex items-start gap-2 rounded-lg bg-surface-hover p-4 text-caption text-muted">
              <Cash size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>To request changes to your management agreement, please <Link href="/contact" className="font-medium text-primary hover:text-accent">contact Nexora</Link>.</span>
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
