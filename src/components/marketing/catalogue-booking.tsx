"use client";

import * as React from "react";
import Link from "next/link";
import { ServiceBookingWizard } from "@/components/marketing/service-booking-wizard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useLive } from "@/lib/stores/live";
import { serviceTypeBySlug, serviceTypesSync } from "@/lib/api/catalogue";

/**
 * Resolves a service type from the URL slug and hands it to the existing wizard.
 *
 * No knowledge of any particular service lives here — whatever the admin has
 * configured is what gets rendered, which is why a brand-new service type is
 * bookable the moment it is created.
 */
export function CatalogueBooking({ slug }: { slug: string }) {
  // Re-read after hydration so a type created at runtime resolves on first paint.
  const revision = useLive((s) => s.revision);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const type = React.useMemo(
    () => serviceTypeBySlug(slug),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, revision, mounted],
  );

  if (!mounted) return <div className="h-64" />;

  if (!type || !type.active) {
    const available = serviceTypesSync(true);
    return (
      <EmptyState
        title="Service not found"
        description="This service isn’t available to book right now."
        action={
          available.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {available.map((t) => (
                <Button key={t.id} asChild variant="outline" size="sm">
                  <Link href={`/book/${t.slug}`}>{t.name}</Link>
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">Book online</p>
        <h1 className="mt-3 font-heading text-h1 font-semibold text-foreground md:text-hero md:leading-[1.1]">
          {type.name}
        </h1>
        {type.description && <p className="mt-4 text-body text-muted">{type.description}</p>}
      </div>
      <ServiceBookingWizard
        config={{
          kind: "lifestyle",
          detailsTitle: "Service details",
          propertyFields: false,
          // Single option — the service type is already chosen by the URL.
          categories: [{ label: type.name, icon: "Sparkles", blurb: type.description ?? "Book this service online." }],
        }}
      />
    </>
  );
}
