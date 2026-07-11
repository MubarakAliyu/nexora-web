"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Phone, Envelope, Cash, ChartLineUp, Receipt, Building, FileLines, UserCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { getOwnerDetail, type OwnerDetail, type Property, type Scope } from "@/lib/api/admin";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Disbursement = OwnerDetail["disbursements"][number];

export default function OwnerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error } = useAsync(() => getOwnerDetail(params.id, scope), [params.id, scope]);

  if (loading) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-24 w-full rounded-xl" /><SkeletonText className="mt-6" lines={3} /></div>;
  }
  if (error || !data) {
    return (
      <EmptyState icon={<UserCircle size={22} />} title="Owner not found" description={error ?? "This owner couldn’t be loaded."}
        action={<Button variant="outline" onClick={() => router.push("/admin/owners")}>Back to owners</Button>} />
    );
  }

  const { owner, properties, financials, disbursements } = data;

  const propColumns: Column<Property>[] = [
    {
      key: "name", header: "Property", sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-active"><Image src={p.image} alt="" fill sizes="56px" className="object-cover" /></div>
          <div className="min-w-0"><p className="truncate font-medium text-foreground">{p.name}</p><p className="truncate text-caption text-muted">{p.location}</p></div>
        </div>
      ),
    },
    { key: "units", header: "Units", sortable: true, align: "right" },
    { key: "occupancy", header: "Occupancy", sortable: true, align: "right", render: (p) => `${p.occupancy}%` },
    { key: "monthlyRevenue", header: "Revenue / mo", sortable: true, align: "right", render: (p) => formatUGX(p.monthlyRevenue) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  const disbColumns: Column<Disbursement>[] = [
    { key: "period", header: "Period", render: (d) => <span className="font-medium text-foreground">{d.period}</span> },
    { key: "gross", header: "Gross", align: "right", render: (d) => formatUGX(d.gross) },
    { key: "fees", header: "Mgmt fee", align: "right", render: (d) => <span className="text-muted">−{formatUGX(d.fees)}</span> },
    { key: "net", header: "Net payout", align: "right", render: (d) => <span className="font-medium text-foreground">{formatUGX(d.net)}</span> },
    { key: "date", header: "Date", render: (d) => formatDate(d.date) },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status === "paid" ? "paid" : "pending"} /> },
  ];

  return (
    <div>
      <PageHeader title={owner.name} subtitle="Property owner"
        actions={<Button className="gap-2" onClick={() => toast.info("Message owner", { description: "Messaging is mocked in this build." })}><Envelope size={18} /> Message</Button>} />

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16"><AvatarFallback className="text-h3">{initials(owner.name)}</AvatarFallback></Avatar>
            <div>
              <p className="font-heading text-h3 font-semibold text-foreground">{owner.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
                <span className="inline-flex items-center gap-1.5"><Envelope size={14} /> {owner.email}</span>
                <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {owner.phone}</span>
                <span className="inline-flex items-center gap-1.5"><Building size={14} /> {properties.length} properties</span>
              </div>
            </div>
          </div>
          <p className="text-caption text-muted">Owner since {formatDate(owner.since)}</p>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="disbursements">Disbursements</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue / mo" value={formatUGX(financials.monthlyRevenue)} icon={<Cash size={22} />} />
            <StatCard label="YTD revenue" value={formatUGX(financials.ytdRevenue)} icon={<ChartLineUp size={22} />} />
            <StatCard label="Disbursed" value={formatUGX(financials.disbursed)} icon={<Cash size={22} />} hint="net paid out" />
            <StatCard label="Outstanding" value={formatUGX(financials.outstanding)} icon={<Receipt size={22} />} hint={financials.outstanding > 0 ? "in arrears" : "all settled"} />
          </div>
          <Card className="mt-4 p-6">
            <h3 className="font-heading text-h3 font-semibold text-foreground">Portfolio summary</h3>
            <p className="mt-2 text-body leading-relaxed text-muted">
              {owner.name} owns {properties.length} propert{properties.length === 1 ? "y" : "ies"} under Nexora management,
              generating {formatUGX(financials.monthlyRevenue)} in monthly revenue. Net disbursements are made on the 5th of each month
              after the management fee.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <DataTable columns={propColumns} data={properties} getRowId={(p) => p.id}
            onRowClick={(p) => router.push(`/admin/properties/${p.id}`)}
            emptyTitle="No properties" emptyDescription="This owner has no properties yet." pageSize={8} />
        </TabsContent>

        <TabsContent value="disbursements">
          <DataTable columns={disbColumns} data={disbursements} getRowId={(d) => d.id}
            emptyTitle="No disbursements" emptyDescription="Payouts will appear here." pageSize={8} />
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState icon={<FileLines size={22} />} title="No documents yet"
            description="Ownership agreements, statements and tax documents will live here."
            action={<Button variant="outline" onClick={() => toast.info("Upload document", { description: "Document upload is mocked in this build." })}>Upload document</Button>} />
        </TabsContent>
      </Tabs>

      <div className="mt-8"><Link href="/admin/owners" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to owners</Link></div>
    </div>
  );
}
