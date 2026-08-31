"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileLines, Home, Download, CalendarMonth, MapPin, UserCircle, CheckCircle, Clock, ShieldCheck, CreditCard, Tools, Phone } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RentalTypeBadge } from "@/components/app/rental-type-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatCurrency, formatDate, fromNow } from "@/lib/format";
import { leaseView, depositSummary } from "@/lib/lease";
import { downloadPdf } from "@/lib/pdf/download";
import { leasePdf } from "@/lib/pdf/builders";
import { getTenant, requestLeaseRenewal, NOW_ISO, type Scope } from "@/lib/api/admin";
import { whatsappHref } from "@/content/site";
import type { Lease } from "@/lib/mock/types";

const renewalSchema = z.object({
  preferredEnd: z.string().min(1, "Choose a preferred end date"),
  notes: z.string().optional(),
});
type RenewalValues = z.infer<typeof renewalSchema>;

function addMonthsIso(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function RenewalDialog({ open, onOpenChange, lease, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; lease: Lease; onDone: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RenewalValues>({
    resolver: zodResolver(renewalSchema),
    defaultValues: { preferredEnd: addMonthsIso(lease.end, 12), notes: "" },
  });
  React.useEffect(() => { if (open) reset({ preferredEnd: addMonthsIso(lease.end, 12), notes: "" }); }, [open, lease.end, reset]);
  const onSubmit = async (v: RenewalValues) => {
    try {
      await requestLeaseRenewal(lease.id, { preferredEnd: new Date(v.preferredEnd).toISOString(), notes: v.notes });
      toast.success("Renewal request submitted", { description: "Nexora will review your request." });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t submit renewal request"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Lease Renewal</DialogTitle>
          <DialogDescription>Tell Nexora your preferred terms — they’ll review and get back to you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Preferred new end date" htmlFor="rn-end" error={errors.preferredEnd?.message}>
            <Input id="rn-end" type="date" {...register("preferredEnd")} aria-invalid={!!errors.preferredEnd} />
          </Field>
          <Field label="Any terms to discuss" htmlFor="rn-notes">
            <Textarea id="rn-notes" rows={3} {...register("notes")} placeholder="e.g. Would like to negotiate a rent reduction" />
          </Field>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const [renewOpen, setRenewOpen] = React.useState(false);

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
  const v = leaseView(lease, NOW_ISO);
  const monthsLeft = Math.max(0, Math.round((new Date(lease.end).getTime() - new Date(NOW_ISO).getTime()) / (30 * 86_400_000)));
  const dep = depositSummary(lease, formatCurrency);
  const renewalRequested = lease.status === "renewal_requested" || lease.status === "pending_renewal";
  const canRequestRenewal = v.status === "active" || v.status === "expiring_soon";
  const renewalState =
    renewalRequested ? { label: "Renewal requested", tone: "good" as const, note: "Nexora is reviewing your request" }
    : v.expiringSoon ? { label: "Up for renewal", tone: "bad" as const, note: `Ends ${fromNow(lease.end, NOW_ISO)}` }
    : v.expired ? { label: "Expired", tone: "bad" as const, note: "Please contact Nexora to renew" }
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
        {renewalRequested ? (
          <Button variant="outline" disabled className="gap-2">
            <Clock size={16} /> Renewal Requested — Pending Review
          </Button>
        ) : canRequestRenewal ? (
          <Button variant={v.expiringSoon ? "primary" : "outline"} onClick={() => setRenewOpen(true)}>Request Renewal</Button>
        ) : null}
      </Card>

      {/* Expiry countdown */}
      <Card className="mb-6 p-6 motion-safe:animate-in motion-safe:fade-in">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Clock size={20} className="text-primary" /> Lease timeline</h2>
          <span className={cn("text-body font-semibold", v.expired ? "text-primary" : v.expiringSoon ? "text-primary" : "text-foreground")}>
            {v.expired ? "Your lease has expired" : `${Math.max(0, v.daysToExpiry)} days remaining`}
          </span>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-caption text-muted">
            <span>{formatDate(lease.start)}</span>
            <span>{Math.round(v.progress * 100)}% elapsed</span>
            <span>{formatDate(lease.end)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-hover">
            <div className={cn("h-full rounded-full", v.expiringSoon || v.expired ? "bg-primary" : "bg-accent")} style={{ width: `${Math.round(v.progress * 100)}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Lease terms */}
        <Card className="p-6">
          <h2 className="mb-2 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><FileLines size={20} className="text-primary" /> Lease terms</h2>
          <dl className="divide-y divide-border">
            <DetailRow label="Monthly rent">{formatCurrency(lease.rent)}</DetailRow>
            <DetailRow label="Security deposit">{formatCurrency(lease.deposit)}</DetailRow>
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

      {/* Security deposit status */}
      <Card className="mt-4 border-l-4 border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-primary"><ShieldCheck size={22} /></span>
            <div>
              <h2 className="font-heading text-h3 font-semibold text-foreground">Security Deposit</h2>
              <p className="mt-0.5 text-h3 font-semibold text-foreground">{formatCurrency(lease.deposit)}</p>
            </div>
          </div>
          <StatusBadge status={dep.status} />
        </div>
        <p className="mt-3 text-body text-muted">
          {dep.status === "held"
            ? "This deposit is held by Nexora throughout your tenancy. It will be returned when you move out, subject to property inspection and any outstanding obligations."
            : dep.detail}
        </p>
      </Card>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "View Payment History", icon: <CreditCard size={20} />, href: "/tenant/payments" },
          { label: "Report Maintenance Issue", icon: <Tools size={20} />, href: "/tenant/maintenance" },
          { label: "Contact Nexora", icon: <Phone size={20} />, href: whatsappHref, external: true },
          { label: "Download Lease Agreement", icon: <Download size={20} />, action: () => { const { payload, filename } = leasePdf(lease); downloadPdf(payload, filename); } },
        ].map((a) => {
          const inner = (
            <>
              <span className="text-primary">{a.icon}</span>
              <span className="text-caption font-medium text-foreground">{a.label}</span>
            </>
          );
          const cls = "flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-elevated p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
          if (a.action) return <button key={a.label} type="button" onClick={a.action} className={cls}>{inner}</button>;
          if (a.external) return <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
          return <Link key={a.label} href={a.href!} className={cls}>{inner}</Link>;
        })}
      </div>

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>

      <RenewalDialog open={renewOpen} onOpenChange={setRenewOpen} lease={lease} onDone={reload} />
    </div>
  );
}
