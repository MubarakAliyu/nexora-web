"use client";

/**
 * SCREEN 1 — TODAY (F4.3). The worker's landing page: who they are, whether
 * they're available, what's on today, what's next, and how they're doing.
 */
import * as React from "react";
import { CalendarMonth, CheckCircle, Wallet } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatCurrency } from "@/lib/format";
import { staffForUser, AVAILABILITY_LABEL } from "@/lib/api/worker";
import { jobsToday, jobsUpcoming, workerStats } from "@/lib/api/worker-jobs";
import { AvailabilitySegmented } from "@/components/worker/availability-control";
import { JobCard } from "@/components/worker/job-card";

export default function WorkerTodayPage() {
  const user = useSession((s) => s.user);
  const revision = useLive((s) => s.revision);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );
  const today = React.useMemo(
    () => jobsToday(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const next = React.useMemo(
    () => jobsUpcoming(member, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );
  const stats = React.useMemo(
    () => workerStats(member),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member, revision, mounted],
  );

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <h1 className="font-heading text-h1 font-semibold text-foreground">
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-body text-muted">
          You&rsquo;re currently{" "}
          <span className="font-medium text-foreground">
            {member?.availability ? AVAILABILITY_LABEL[member.availability] : "unset"}
          </span>
          .
        </p>
      </section>

      <section aria-labelledby="avail-h">
        <h2 id="avail-h" className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">
          Your availability
        </h2>
        <AvailabilitySegmented member={member} />
      </section>

      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="sr-only">Your numbers</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <CalendarMonth size={18} className="mx-auto text-primary" />
            <p className="mt-1.5 font-heading text-h2 font-semibold text-foreground">{stats.jobsToday}</p>
            <p className="text-caption text-muted">Jobs today</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle size={18} className="mx-auto text-primary" />
            <p className="mt-1.5 font-heading text-h2 font-semibold text-foreground">{stats.completedThisWeek}</p>
            <p className="text-caption text-muted">Done this week</p>
          </Card>
          <Card className="p-3 text-center">
            <Wallet size={18} className="mx-auto text-primary" />
            <p className="mt-1.5 font-heading text-h3 font-semibold text-foreground">
              {formatCurrency(stats.earningsThisMonth)}
            </p>
            <p className="text-caption text-muted">This month</p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="today-h">
        <h2 id="today-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">
          Today&rsquo;s jobs
        </h2>
        {today.length === 0 ? (
          <EmptyState
            icon={<CalendarMonth size={22} />}
            title="No jobs scheduled for today"
            description="Enjoy the quiet — we'll let you know as soon as something comes in."
          />
        ) : (
          <div className="space-y-3">
            {today.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </section>

      {next.length > 0 && (
        <section aria-labelledby="next-h">
          <h2 id="next-h" className="mb-2 font-heading text-h2 font-semibold text-foreground">
            Next up
          </h2>
          <div className="space-y-3">
            {next.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  );
}
