"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Building,
  Home,
  Cash,
  UserCircle,
  FileLines,
  Plus,
  PenNib,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DonutChart, CHART_PALETTE } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX } from "@/lib/format";
import {
  getProperty,
  getPropertyUnits,
  ownerName,
  type Unit,
  type Scope,
} from "@/lib/api/admin";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);

  const property = useAsync(() => getProperty(id, scope), [id, scope]);
  const units = useAsync(() => getPropertyUnits(id, scope), [id, scope]);

  if (property.loading) {
    return (
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
        <SkeletonText className="mt-6" lines={3} />
      </div>
    );
  }
  if (property.error || !property.data) {
    return (
      <EmptyState
        icon={<Building size={22} />}
        title="Property not found"
        description={property.error ?? "This property doesn’t exist or couldn’t be loaded."}
        action={<Button variant="outline" onClick={() => router.push("/admin/properties")}>Back to properties</Button>}
      />
    );
  }

  const p = property.data;
  const occupied = Math.round((p.units * p.occupancy) / 100);
  const vacant = p.units - occupied;

  const unitColumns: Column<Unit>[] = [
    { key: "label", header: "Unit", sortable: true, render: (u) => <span className="font-medium text-foreground">{u.label}</span> },
    { key: "type", header: "Type", sortable: true },
    { key: "floor", header: "Floor", sortable: true, align: "right" },
    { key: "sizeSqm", header: "Size", sortable: true, align: "right", render: (u) => `${u.sizeSqm} m²` },
    { key: "rent", header: "Rent / mo", sortable: true, align: "right", render: (u) => formatUGX(u.rent) },
    { key: "status", header: "Status", sortable: true, render: (u) => <StatusBadge status={u.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title={p.name}
        subtitle={p.location}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Add unit", { description: "Unit creation is mocked in this build." })}>
              <Plus size={18} /> Add unit
            </Button>
            <Button className="gap-2" onClick={() => toast.info("Edit property", { description: "Editing is mocked in this build." })}>
              <PenNib size={18} /> Edit
            </Button>
          </div>
        }
      />

      {/* Hero */}
      <Card variant="media" className="mb-6">
        <div className="relative h-48 w-full md:h-60">
          <Image src={p.image} alt={p.name} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-0 left-0 flex flex-wrap items-center gap-3 p-5">
            <StatusBadge status={p.status} />
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-background">
              <MapPin size={16} /> {p.location}
            </span>
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-background">
              <Building size={16} /> {p.category}
            </span>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buildings">Buildings &amp; Floors</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Units" value={p.units} icon={<Home size={22} />} />
            <StatCard label="Occupancy" value={`${p.occupancy}%`} icon={<Building size={22} />} />
            <StatCard label="Revenue / mo" value={formatUGX(p.monthlyRevenue)} icon={<Cash size={22} />} />
            <StatCard label="Owner" value={<span className="text-h3">{ownerName(p.ownerId)}</span>} icon={<UserCircle size={22} />} />
          </div>
          <Card className="mt-4 p-6">
            <h3 className="font-heading text-h3 font-semibold text-foreground">About this property</h3>
            <p className="mt-2 text-body leading-relaxed text-muted">
              {p.name} is a {p.category.toLowerCase()} property in {p.location}, comprising {p.units} units
              across {p.buildings.length} building{p.buildings.length === 1 ? "" : "s"}. It is currently
              {" "}<span className="text-foreground">{p.status}</span> by Nexora, running at {p.occupancy}% occupancy.
            </p>
          </Card>
        </TabsContent>

        {/* Buildings & Floors */}
        <TabsContent value="buildings">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.buildings.map((b) => (
              <Card key={b.id} className="p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-active text-primary">
                    <Building size={22} />
                  </span>
                  <div>
                    <p className="font-heading text-h3 font-semibold text-foreground">{b.name}</p>
                    <p className="text-caption text-muted">{b.floors} floors · {b.units} units</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Array.from({ length: b.floors }).map((_, i) => (
                    <span key={i} className="flex h-7 w-7 items-center justify-center rounded bg-surface-hover text-caption text-muted">
                      {i + 1}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units">
          <DataTable
            columns={unitColumns}
            data={units.data ?? []}
            getRowId={(u) => u.id}
            loading={units.loading}
            error={units.error}
            onRetry={units.reload}
            emptyTitle="No units recorded"
            emptyDescription="Units for this property will appear here."
            pageSize={8}
          />
        </TabsContent>

        {/* Occupancy */}
        <TabsContent value="occupancy">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 font-heading text-h3 font-semibold text-foreground">Occupied vs vacant</h3>
              <DonutChart
                data={[
                  { name: "Occupied", value: occupied },
                  { name: "Vacant", value: vacant },
                ]}
                colors={[CHART_PALETTE[0], "var(--border)"]}
                height={240}
              />
            </Card>
            <Card className="flex flex-col justify-center gap-4 p-6">
              <div>
                <p className="text-caption uppercase tracking-wide text-muted">Current occupancy</p>
                <p className="mt-1 font-heading text-hero font-semibold text-foreground">{p.occupancy}%</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-active">
                <div className="h-full rounded-full bg-primary" style={{ width: `${p.occupancy}%` }} />
              </div>
              <p className="text-body text-muted">
                {occupied} of {p.units} units occupied · {vacant} available to let.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <EmptyState
            icon={<FileLines size={22} />}
            title="No documents yet"
            description="Title deeds, management agreements and inspection reports will live here."
            action={
              <Button variant="outline" onClick={() => toast.info("Upload document", { description: "Document upload is mocked in this build." })}>
                Upload document
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Link href="/admin/properties" className="text-body font-medium text-primary transition-colors hover:text-accent">
          ← Back to properties
        </Link>
      </div>
    </div>
  );
}
