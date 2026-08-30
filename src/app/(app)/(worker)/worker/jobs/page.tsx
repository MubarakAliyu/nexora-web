"use client";

/** SCREEN 2 — MY JOBS (F4.3). Upcoming / In progress / Completed. */
import * as React from "react";
import { ClipboardList } from "flowbite-react-icons/outline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { staffForUser } from "@/lib/api/worker";
import { jobsForWorker } from "@/lib/api/worker-jobs";
import { JobCard } from "@/components/worker/job-card";
import type { WorkerJob } from "@/lib/api/worker-jobs";

export default function WorkerJobsPage() {
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const jobs = React.useMemo(
    () => jobsForWorker(staffForUser(user?.id, user?.staffId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );

  if (!mounted) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-2xl" /></div>;
  }

  const upcoming = jobs.filter((j) => j.stage === "assigned" || j.stage === "accepted");
  const active = jobs.filter((j) => j.stage === "in_progress");
  const done = jobs.filter((j) => j.stage === "completed" || j.stage === "confirmed");

  const list = (items: WorkerJob[], empty: string) =>
    items.length === 0
      ? <EmptyState icon={<ClipboardList size={22} />} title={empty} />
      : <div className="space-y-3">{items.map((j) => <JobCard key={j.id} job={j} />)}</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 font-heading text-h1 font-semibold text-foreground">My jobs</h1>
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="active" className="flex-1">In progress ({active.length})</TabsTrigger>
          <TabsTrigger value="done" className="flex-1">Completed ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">{list(upcoming, "Nothing upcoming")}</TabsContent>
        <TabsContent value="active" className="mt-4">{list(active, "Nothing in progress")}</TabsContent>
        <TabsContent value="done" className="mt-4">{list(done, "Nothing completed yet")}</TabsContent>
      </Tabs>
    </div>
  );
}
