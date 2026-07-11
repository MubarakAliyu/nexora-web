"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Phone, Envelope, ClipboardList, Cash, Clock, Bell } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate, fromNow } from "@/lib/format";
import { getLead, addLeadActivity, NOW_ISO, type LeadActivity, type Scope } from "@/lib/api/admin";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getLead(params.id, scope), [params.id, scope]);

  const [kind, setKind] = React.useState<LeadActivity["kind"]>("note");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const logActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !data) return;
    setBusy(true);
    try {
      await addLeadActivity(data.id, kind, text.trim());
      toast.success("Activity logged", { description: "Timeline updated." });
      setText("");
      reload();
    } catch { toast.error("Couldn’t log activity"); }
    finally { setBusy(false); }
  };

  if (loading) return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-24 w-full rounded-xl" /><SkeletonText className="mt-6" lines={3} /></div>;
  if (error || !data) {
    return <EmptyState icon={<ClipboardList size={22} />} title="Lead not found" description={error ?? "This lead couldn’t be loaded."}
      action={<Button variant="outline" onClick={() => router.push("/admin/leads")}>Back to leads</Button>} />;
  }

  const activities = [...data.activities].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div>
      <PageHeader title={data.name} subtitle={`Lead · ${data.service}`}
        actions={<Button className="gap-2" onClick={() => toast.info("Convert to client", { description: "Conversion flow is mocked in this build." })}>Convert</Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-h3 font-semibold text-foreground">Details</h3>
              <StatusBadge status={data.status} />
            </div>
            <dl className="mt-4 space-y-3 text-body">
              <div className="flex items-center gap-2 text-muted"><Envelope size={16} /> <span className="text-foreground">{data.email}</span></div>
              <div className="flex items-center gap-2 text-muted"><Phone size={16} /> <span className="text-foreground">{data.phone}</span></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Source</dt><dd className="text-foreground">{data.source}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Owner</dt><dd className="text-foreground">{data.owner}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-1.5 text-muted"><Cash size={16} /> Est. value</dt><dd className="font-medium text-foreground">{formatUGX(data.value)}</dd></div>
            </dl>
          </Card>

          <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
            <span className="text-primary"><Bell size={18} /></span>
            <div>
              <p className="text-body font-medium text-foreground">Follow-up reminder</p>
              <p className="text-caption text-muted">Next touch due {formatDate(NOW_ISO)} — log an activity to keep the thread warm.</p>
            </div>
          </Card>
        </div>

        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-5 font-heading text-h3 font-semibold text-foreground">Activity</h3>

          <form onSubmit={logActivity} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-40">
              <Field label="Type" htmlFor="la-kind">
                <select id="la-kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as LeadActivity["kind"])}>
                  <option value="note">Note</option><option value="call">Call</option>
                  <option value="email">Email</option><option value="meeting">Meeting</option>
                </select>
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Details" htmlFor="la-text">
                <Input id="la-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note, call summary…" />
              </Field>
            </div>
            <Button type="submit" loading={busy} disabled={!text.trim()}>Log</Button>
          </form>

          {activities.length > 0 ? (
            <Timeline>
              {activities.map((a) => (
                <TimelineItem key={a.id} title={a.text} time={fromNow(a.at, NOW_ISO)} icon={<Clock size={11} />}>
                  <span className="capitalize text-caption text-muted">{a.kind}</span>
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <EmptyState title="No activity yet" description="Log the first touchpoint above." />
          )}
        </Card>
      </div>

      <div className="mt-8"><Link href="/admin/leads" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to leads</Link></div>
    </div>
  );
}
