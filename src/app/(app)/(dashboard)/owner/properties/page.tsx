"use client";

import * as React from "react";
import { Building } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { OwnerPropertyCard } from "@/components/app/owner-property-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { listProperties, type Scope } from "@/lib/api/admin";

export default function OwnerPropertiesPage() {
  const ownerId = useSession((s) => s.user?.ownerId);
  const scope: Scope = React.useMemo(() => ({ ownerId, forceError: debugErrorFlag() }), [ownerId]);
  const { data, loading, error, reload } = useAsync(() => listProperties(undefined, scope), [scope]);

  return (
    <div>
      <PageHeader title="My Properties" subtitle="Everything Nexora manages on your behalf" />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <EmptyState icon={<Building size={22} />} title="Couldn’t load your properties" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => <OwnerPropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <EmptyState icon={<Building size={22} />} title="No properties yet" description="Properties you own will appear here once onboarded." />
      )}
    </div>
  );
}
