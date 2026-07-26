"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { FileLines, Home, Download, CalendarMonth, MapPin, UserCircle, CheckCircle, Clock } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RentalTypeBadge } from "@/components/app/rental-type-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatUGX, formatDate, fromNow } from "@/lib/format";
import { downloadPdf } from "@/lib/pdf/download";
import { leasePdf } from "@/lib/pdf/builders";
import { getTenant, NOW_ISO, type Scope } from "@/lib/api/admin";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-body text-muted">{label}</dt>
      <dd className="text-right text-body font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function TenantLeasePage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);

  if (loading) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-40 w-full rounded-xl" /><SkeletonText className="mt-6" lines={4} /></div>;
  }
  if (error || !data || !data.lease) {
    return (
      <EmptyState icon={<FileLines size={22} />} title="No lease found"
        description={error ?? "We couldn’t find an active lease for your account."}
        action={<Button variant="outline" asChild><Link href="/tenant">Back to dashboard</Link></Button>} />
    );
  }

  const { lease, unit, property, tenant } = data;
  const monthsLeft = Math.max(0, Math.round((new Date(lease.end).getTime() - Date.now()) / (30 * 86_400_000)));
  const renewalState =
    lease.status === "expiring" ? { label: "Up for renewal", tone: "bad" as const, note: `Ends ${fromNow(lease.end, NOW_ISO)}` }
    : lease.status === "expired" ? { label: "Expired", tone: "bad" as const, note: "Please contact Nexora to renew" }
    : { label: "Active & in good standing", tone: "good" as const, note: `About ${monthsLeft} months remaining` };

  return (
    <div>
      <PageHeader
        title="My Lease"
        subtitle={`${unit?.label ?? "Your unit"} · ${property?.name ?? ""}`}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => { const { payload, filename } = leasePdf(lease); downloadPdf(payload, filename); }}>
            <Download size={18} /> Download agreement
          </Button>
        }
      />

      {/* Hero */}
      {property && (
        <Card variant="media" className="mb-6">
          <div className="relative h-44 w-full md:h-56">
            <Image src={property.image} alt={property.name} fill sizes="100vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 to-transparent" />
            <div className="absolute bottom-0 left-0 flex flex-wrap items-center gap-3 p-5">
              <StatusBadge status={lease.status} />
              <RentalTypeBadge type={property.rentalType} />
              <span className="inline-flex items-center gap-1.5 text-caption font-medium text-background"><MapPin size={16} /> {property.location}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Renewal banner */}
      <Card className={`mb-6 flex flex-col items-start justify-between gap-4 border-l-4 p-6 sm:flex-row sm:items-center ${renewalState.tone === "bad" ? "border-primary" : "border-border"}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">{renewalState.tone === "good" ? <CheckCircle size={22} /> : <Clock size={22} />}</span>
          <div>
            <p className="font-heading text-h3 font-semibold text-foreground">{renewalState.label}</p>
            <p className="mt-1 text-body text-muted">{renewalState.note}</p>
          </div>
        </div>
        <Button variant={renewalState.tone === "bad" ? "primary" : "outline"} onClick={() => toast.info("Renewal request", { description: "Your renewal request has been sent to Nexora (mocked)." })}>
          Request renewal
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lease terms */}
        <Card className="p-6">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><FileLines size={20} className="text-primary" /> Lease terms</h2>
          <dl className="divide-y divide-border">
            <DetailRow label="Monthly rent">{formatUGX(lease.rent)}</DetailRow>
            <DetailRow label="Security deposit">{formatUGX(lease.deposit)}</DetailRow>
            <DetailRow label="Payment frequency"><span className="capitalize">{lease.frequency}</span></DetailRow>
            <DetailRow label="Rent due day">{lease.dueDay ? `Day ${lease.dueDay} of the month` : "5th of the month"}</DetailRow>
            <DetailRow label="Grace period">{lease.gracePeriod ? `${lease.gracePeriod} days` : "3 days"}</DetailRow>
          </dl>
        </Card>

        {/* Dates */}
        <Card className="p-6">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><CalendarMonth size={20} className="text-primary" /> Term & dates</h2>
          <dl className="divide-y divide-border">
            <DetailRow label="Lease status"><StatusBadge status={lease.status} /></DetailRow>
            <DetailRow label="Start date">{formatDate(lease.start)}</DetailRow>
            <DetailRow label="End date">{formatDate(lease.end)}</DetailRow>
            <DetailRow label="Time remaining">{monthsLeft} months</DetailRow>
            <DetailRow label="Renewal">{renewalState.label}</DetailRow>
          </dl>
        </Card>

        {/* Unit */}
        <Card className="p-6">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Home size={20} className="text-primary" /> Unit details</h2>
          <dl className="divide-y divide-border">
            <DetailRow label="Unit">{unit?.label ?? "—"}</DetailRow>
            <DetailRow label="Type">{unit?.type ?? "—"}</DetailRow>
            <DetailRow label="Bedrooms">{unit?.bedrooms ?? "—"}</DetailRow>
            <DetailRow label="Size">{unit?.sizeSqm ? `${unit.sizeSqm} m²` : "—"}</DetailRow>
            <DetailRow label="Floor">{unit?.floor ?? "—"}</DetailRow>
          </dl>
        </Card>

        {/* Tenant */}
        <Card className="p-6">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><UserCircle size={20} className="text-primary" /> Tenant</h2>
          <dl className="divide-y divide-border">
            <DetailRow label="Name">{tenant.name}</DetailRow>
            <DetailRow label="Email">{tenant.email}</DetailRow>
            <DetailRow label="Phone">{tenant.phone}</DetailRow>
            <DetailRow label="Tenant since">{formatDate(tenant.since)}</DetailRow>
            <DetailRow label="Status"><StatusBadge status={tenant.status} /></DetailRow>
          </dl>
        </Card>
      </div>

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>
    </div>
  );
}
