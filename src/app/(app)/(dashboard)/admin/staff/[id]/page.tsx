"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AngleLeft, Envelope, Phone, Briefcase, CalendarMonth, Tools, ClipboardList, MapPin } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { AvailabilityBadge } from "@/components/admin/availability-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { getStaffMember, DEPARTMENT_LABEL, type StaffAssignment, type StaffDepartment, type Scope } from "@/lib/api/admin";
import { roleLabels } from "@/lib/roles";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getStaffMember(id, scope), [id, scope]);

  const assignmentCols: Column<StaffAssignment>[] = [
    {
      key: "kind", header: "Type",
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 text-caption text-muted">
          {a.kind === "maintenance" ? <Tools size={14} /> : <ClipboardList size={14} />}
          {a.kind === "maintenance" ? "Maintenance" : "Service"}
        </span>
      ),
    },
    { key: "ref", header: "Ref", render: (a) => <span className="font-medium text-foreground">{a.ref}</span> },
    { key: "title", header: "Job", render: (a) => a.title },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    { key: "date", header: "Updated", align: "right", render: (a) => formatDate(a.date) },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card className="p-6"><Skeleton className="h-24 w-full" /></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<Briefcase size={22} />}
        title="Couldn’t load staff member"
        description={error ?? "Not found."}
        action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>}
      />
    );
  }

  const m = data.member;
  const isOps = (m.staffType ?? "system_user") === "operational_staff";
  const dept = m.department ? (DEPARTMENT_LABEL[m.department as StaffDepartment] ?? m.department) : undefined;

  return (
    <div>
      <button onClick={() => router.push("/admin/staff")} className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-muted transition-colors hover:text-foreground">
        <AngleLeft size={15} /> Back to staff
      </button>

      <PageHeader
        title={m.name}
        subtitle={isOps ? `${m.jobTitle ?? "Operational staff"} · ${dept ?? "Operations"}` : (m.role ? roleLabels[m.role] : "Staff")}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Avatar className="h-16 w-16"><AvatarFallback className="text-h3">{initials(m.name)}</AvatarFallback></Avatar>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isOps ? "muted" : "secondary"}>{isOps ? "Operational staff" : "System user"}</Badge>
          <StatusBadge status={m.status} />
          <AvailabilityBadge value={m.availability ?? "available"} />
          {dept && <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption text-muted"><Briefcase size={13} /> {dept}</span>}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="assignments">Assignments ({data.assignments.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted"><Envelope size={18} /></span>
                <div><dt className="text-caption text-muted">Email</dt><dd className="text-body text-foreground">{m.email ?? "Not provided"}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted"><Phone size={18} /></span>
                <div><dt className="text-caption text-muted">Phone</dt><dd className="text-body text-foreground">{m.phone ?? "—"}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted"><Briefcase size={18} /></span>
                <div><dt className="text-caption text-muted">Department</dt><dd className="text-body text-foreground">{dept ?? "—"}</dd></div>
              </div>
              {isOps && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-muted"><Briefcase size={18} /></span>
                  <div><dt className="text-caption text-muted">Job title</dt><dd className="text-body text-foreground">{m.jobTitle ?? "—"}</dd></div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-muted"><CalendarMonth size={18} /></span>
                <div><dt className="text-caption text-muted">Joined</dt><dd className="text-body text-foreground">{formatDate(m.since)}</dd></div>
              </div>
              {isOps && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-muted"><MapPin size={18} /></span>
                  <div><dt className="text-caption text-muted">Address</dt><dd className="text-body text-foreground">{m.address ?? "Not provided"}</dd></div>
                </div>
              )}
            </dl>
            {isOps && (
              <p className="mt-5 rounded-lg border border-border bg-surface-hover p-3 text-caption text-muted">
                Operational staff receive job assignments and do not have platform login access, so no role or permissions apply.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          {data.assignments.length > 0 ? (
            <DataTable columns={assignmentCols} data={data.assignments} getRowId={(a) => a.id} pageSize={8}
              emptyTitle="No assignments" emptyDescription="Assigned jobs will appear here." />
          ) : (
            <EmptyState icon={<ClipboardList size={22} />} title="No assignments yet" description="Maintenance tickets and service jobs assigned to this member will appear here." />
          )}
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total jobs" value={data.performance.totalJobs} icon={<Briefcase size={22} />} />
            <StatCard label="Completed" value={data.performance.completed} icon={<ClipboardList size={22} />} />
            <StatCard label="Active" value={data.performance.active} icon={<Tools size={22} />} />
            <StatCard label="Completion rate" value={`${data.performance.completionRate}%`} icon={<ClipboardList size={22} />} hint={`~${data.performance.avgPerMonth}/mo`} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
