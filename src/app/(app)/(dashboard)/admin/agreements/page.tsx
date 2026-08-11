"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, PenNib, TrashBin, CloseCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { AgreementFormDialog } from "@/components/admin/agreement-form-dialog";
import { TerminateAgreementDialog } from "@/components/admin/terminate-agreement-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { selectClass } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { ownerOptions } from "@/lib/api/admin";
import {
  fetchAgreements, deleteAgreement, agreementRateLabel, CONTRACT_TYPE_LABEL,
  type ManagementAgreement,
} from "@/lib/api/agreements";

const TYPE_TONE: Record<string, "default" | "muted" | "accent"> = {
  revenue_sharing: "default", fixed_fee: "accent", hybrid: "muted",
};
const SCHED_LABEL: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", on_demand: "On Demand" };

export default function AgreementsPage() {
  const router = useRouter();
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [owner, setOwner] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ManagementAgreement | null>(null);
  const [terminating, setTerminating] = React.useState<ManagementAgreement | null>(null);
  const [deleting, setDeleting] = React.useState<ManagementAgreement | null>(null);
  const owners = React.useMemo(() => ownerOptions(), []);

  const scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => fetchAgreements(scope), [scope]);

  const rows = React.useMemo(() => {
    let r = data ?? [];
    if (type !== "all") r = r.filter((a) => a.contractType === type);
    if (status !== "all") r = r.filter((a) => a.status === status);
    if (owner !== "all") r = r.filter((a) => a.ownerId === owner);
    if (q) { const s = q.toLowerCase(); r = r.filter((a) => a.ownerName.toLowerCase().includes(s)); }
    return r;
  }, [data, type, status, owner, q]);

  const columns: Column<ManagementAgreement>[] = [
    {
      key: "ownerName", header: "Owner", sortable: true,
      render: (a) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); router.push(`/admin/owners/${a.ownerId}`); }}
          className="font-medium text-foreground transition-colors hover:text-primary">{a.ownerName}</button>
      ),
    },
    { key: "contractType", header: "Type", render: (a) => <Badge variant={TYPE_TONE[a.contractType]}>{CONTRACT_TYPE_LABEL[a.contractType]}</Badge> },
    { key: "rate", header: "Rate / Amount", render: (a) => <span className="font-medium text-foreground">{agreementRateLabel(a)}</span> },
    { key: "effectiveDate", header: "Effective", sortable: true, render: (a) => formatDate(a.effectiveDate) },
    { key: "expiryDate", header: "Expiry", sortable: true, render: (a) => formatDate(a.expiryDate) },
    { key: "settlementSchedule", header: "Settlement", render: (a) => <Badge variant="muted">{SCHED_LABEL[a.settlementSchedule]}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (a) => (
        <RowActions actions={[
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditing(a); setFormOpen(true); } },
          { label: "Terminate", icon: <CloseCircle size={16} />, onClick: () => setTerminating(a) },
          { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(a), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Management Agreements"
        subtitle="How Nexora earns from managing each owner’s properties — the source of truth for all settlements"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Create Agreement</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by owner…" aria-label="Search agreements" className="h-10 pl-10" />
        </div>
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)} aria-label="Contract type">
          <option value="all">All types</option>
          <option value="revenue_sharing">Revenue Sharing</option>
          <option value="fixed_fee">Fixed Fee</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="draft">Draft</option>
          <option value="terminated">Terminated</option>
        </select>
        <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
          <option value="all">All owners</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns} data={rows} getRowId={(a) => a.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(a) => router.push(`/admin/agreements/${a.id}`)}
        emptyTitle="No agreements found" emptyDescription="Create a management agreement to define how Nexora earns from an owner." pageSize={10}
      />

      <AgreementFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <TerminateAgreementDialog agreement={terminating} onOpenChange={(o) => !o && setTerminating(null)} onDone={reload} />
      <DeleteConfirmation
        open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
        entityLabel="management agreement" entityName={deleting?.ownerName ?? ""}
        description="Delete this management agreement? This action cannot be undone. Historical settlement records will be preserved but will no longer reference an active agreement."
        onConfirm={async () => { if (!deleting) return; try { await deleteAgreement(deleting.id); toast.success("Agreement deleted", { description: deleting.ownerName }); reload(); } catch { toast.error("Couldn’t delete agreement"); } }}
      />
    </div>
  );
}
