"use client";

import * as React from "react";
import { Users, Plus } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { listStaff, type Staff, type Scope } from "@/lib/api/admin";
import { roleLabels } from "@/lib/roles";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function StaffPage() {
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listStaff(scope), [scope]);

  const columns: Column<Staff>[] = [
    {
      key: "name", header: "Staff member", sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9"><AvatarFallback className="text-caption">{initials(s.name)}</AvatarFallback></Avatar>
          <div><p className="font-medium text-foreground">{s.name}</p><p className="text-caption text-muted">{s.email}</p></div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortable: true, render: (s) => roleLabels[s.role] },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "since", header: "Joined", sortable: true, align: "right", render: (s) => formatDate(s.since) },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Internal team members"
        actions={<Button className="gap-2" onClick={() => toast.info("Invite staff", { description: "Full staff management arrives in Phase 2." })}><Plus size={18} /> Invite</Button>}
      />

      <Card className="mb-4 flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
        <span className="text-primary"><Users size={20} /></span>
        <div>
          <p className="text-body font-medium text-foreground">Full staff management is coming in Phase 2</p>
          <p className="text-caption text-muted">Invites, granular permissions, activity logs and team assignment will land in the next phase. The current team is shown below.</p>
        </div>
      </Card>

      <DataTable columns={columns} data={data ?? []} getRowId={(s) => s.id} loading={loading} error={error} onRetry={reload}
        emptyTitle="No staff yet" emptyDescription="Team members will appear here." pageSize={8} />
    </div>
  );
}
