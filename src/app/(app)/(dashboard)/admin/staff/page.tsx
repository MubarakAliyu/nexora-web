"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, PenNib, TrashBin, Search, LockOpen } from "flowbite-react-icons/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { hasLoginAccount } from "@/lib/api/password-reset";
import { useSession } from "@/lib/stores/session";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { AvailabilityBadge } from "@/components/admin/availability-badge";
import { OperationalStaffDialog } from "@/components/admin/operational-staff-dialog";
import { GrantPortalAccessDialog, RevokePortalAccessDialog } from "@/components/admin/grant-portal-access-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listStaff, inviteStaff, updateStaff, removeStaff, cycleStaffAvailability,
  removeOperationalStaff, openAssignmentsFor, DEPARTMENT_LABEL,
  type Staff, type StaffDepartment, type Scope,
} from "@/lib/api/admin";
import { adminRoles, roleLabels, type Role } from "@/lib/roles";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const inviteSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  role: z.string().min(1, "Choose a role"),
  department: z.string().optional(),
  phone: z.string().optional(),
});
type InviteValues = z.infer<typeof inviteSchema>;

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", role: "property_manager", department: "", phone: "" },
  });
  React.useEffect(() => { if (open) reset({ name: "", email: "", role: "property_manager", department: "", phone: "" }); }, [open, reset]);
  const onSubmit = async (v: InviteValues) => {
    try { await inviteStaff({ name: v.name, email: v.email, role: v.role as Role, department: v.department, phone: v.phone }); toast.success("Invitation sent", { description: `${v.name} was invited as ${roleLabels[v.role as Role]}.` }); onOpenChange(false); onDone(); }
    catch { toast.error("Couldn’t send invite"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a staff member</DialogTitle><DialogDescription>They’ll receive an invitation and appear as “Invited”.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="st-name" error={errors.name?.message}><Input id="st-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="st-email" error={errors.email?.message}><Input id="st-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Role" htmlFor="st-role" error={errors.role?.message}>
              <select id="st-role" className={selectClass} {...register("role")} aria-invalid={!!errors.role}>
                {adminRoles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </Field>
            <Field label="Department" htmlFor="st-dep"><Input id="st-dep" placeholder="e.g. Operations" {...register("department")} /></Field>
            <Field label="Phone" htmlFor="st-phone"><Input id="st-phone" placeholder="+256 7…" {...register("phone")} /></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Send invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({ member, onOpenChange, onDone }: { member: Staff | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [role, setRole] = React.useState<Role>("property_manager");
  const [status, setStatus] = React.useState<Staff["status"]>("active");
  const [department, setDepartment] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (member) { setRole(member.role ?? "property_manager"); setStatus(member.status); setDepartment(member.department ?? ""); setPhone(member.phone ?? ""); }
  }, [member]);
  const save = async () => {
    if (!member) return;
    setBusy(true);
    try { await updateStaff(member.id, { role, status, department, phone }); toast.success("Staff updated", { description: `${member.name} saved.` }); onOpenChange(false); onDone(); }
    catch { toast.error("Couldn’t update staff"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        {member && (
          <>
            <DialogHeader><DialogTitle>Edit {member.name}</DialogTitle><DialogDescription>{member.email}</DialogDescription></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role" htmlFor="es-role">
                <select id="es-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {adminRoles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select>
              </Field>
              <Field label="Status" htmlFor="es-status">
                <select id="es-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as Staff["status"])}>
                  <option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Deactivated</option>
                </select>
              </Field>
              <Field label="Department" htmlFor="es-dep"><Input id="es-dep" value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
              <Field label="Phone" htmlFor="es-phone"><Input id="es-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={save} loading={busy}>Save changes</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// System-user departments (free text) plus the operational department keys.
const SYSTEM_DEPARTMENTS = ["Executive", "Property Management", "Finance", "Operations", "Maintenance"];
const OPS_DEPARTMENTS = Object.keys(DEPARTMENT_LABEL) as StaffDepartment[];

const isOps = (s: Staff) => (s.staffType ?? "system_user") === "operational_staff";
const deptLabel = (d?: string) =>
  d ? (DEPARTMENT_LABEL[d as StaffDepartment] ?? d) : undefined;

export default function StaffPage() {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [opsOpen, setOpsOpen] = React.useState(false);
  const [editingOps, setEditingOps] = React.useState<Staff | null>(null);
  const [editing, setEditing] = React.useState<Staff | null>(null);
  const [removing, setRemoving] = React.useState<Staff | null>(null);
  const [deactivating, setDeactivating] = React.useState<Staff | null>(null);
  // Only system users have a login; operational staff have nothing to reset.
  const isSuperAdmin = useSession((st) => st.user?.role) === "super_admin";
  const [resetting, setResetting] = React.useState<Staff | null>(null);
  // F4.1 — worker portal access is granted per operational staff member.
  const [granting, setGranting] = React.useState<Staff | null>(null);
  const [revoking, setRevoking] = React.useState<Staff | null>(null);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<"all" | "system_user" | "operational_staff">("all");
  const [dept, setDept] = React.useState("all");
  const [availability, setAvailability] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => listStaff(scope), [scope]);

  const all = data ?? [];
  const rows = all.filter((s) => {
    if (q && !`${s.name} ${s.email ?? ""} ${s.jobTitle ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "all" && (s.staffType ?? "system_user") !== type) return false;
    if (dept !== "all" && s.department !== dept) return false;
    if (availability !== "all" && (s.availability ?? "available") !== availability) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  });

  const summary = {
    total: all.length,
    system: all.filter((s) => !isOps(s)).length,
    ops: all.filter(isOps).length,
    available: all.filter((s) => s.status === "active" && (s.availability ?? "available") === "available").length,
  };

  const cycle = async (s: Staff) => {
    try { const m = await cycleStaffAvailability(s.id); toast.success(`${s.name} is now ${m.availability}`); reload(); }
    catch { toast.error("Couldn’t update availability"); }
  };

  const doDeactivate = async (s: Staff) => {
    try { await updateStaff(s.id, { status: "suspended" }); toast.success("Deactivated", { description: s.name }); reload(); }
    catch { toast.error("Couldn’t update"); }
  };

  const doReactivate = async (s: Staff) => {
    try { await updateStaff(s.id, { status: "active" }); toast.success("Reactivated", { description: s.name }); reload(); }
    catch { toast.error("Couldn’t update"); }
  };

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
    {
      key: "staffType", header: "Type",
      render: (s) => isOps(s)
        ? <Badge variant="muted">Operational</Badge>
        : <Badge variant="secondary">System user</Badge>,
    },
    {
      key: "role", header: "Role", sortable: true,
      // Operational staff have no platform role — show what they actually do.
      render: (s) => isOps(s)
        ? <div><p className="text-foreground">{s.jobTitle ?? "—"}</p><p className="text-caption text-muted">{deptLabel(s.department)}</p></div>
        : (s.role ? roleLabels[s.role] : "—"),
    },
    { key: "department", header: "Department", render: (s) => deptLabel(s.department) ?? <span className="text-muted">—</span> },
    {
      key: "availability", header: "Availability",
      render: (s) => (
        <AvailabilityBadge value={s.availability ?? "available"} onClick={(e) => { e.stopPropagation(); cycle(s); }} />
      ),
    },
    { key: "assignedJobs", header: "Jobs", align: "right", render: (s) => <span className="tabular-nums text-foreground">{s.assignedJobs ?? 0}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "since", header: "Joined", sortable: true, align: "right", render: (s) => formatDate(s.since) },
    {
      key: "actions", header: "", align: "right",
      render: (s) => (
        <RowActions actions={[
          { label: "View profile", icon: <Users size={16} />, onClick: () => router.push(`/admin/staff/${s.id}`) },
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => isOps(s) ? setEditingOps(s) : setEditing(s) },
          s.status === "suspended"
            ? { label: "Reactivate", onClick: () => doReactivate(s) }
            : { label: "Deactivate", onClick: () => setDeactivating(s) },
          ...(isSuperAdmin && !isOps(s) && hasLoginAccount(s.id)
            ? [{ label: "Reset password", icon: <LockOpen size={16} />, onClick: () => setResetting(s), separatorBefore: true }]
            : []),
          /* F4.1 — only operational staff get a worker login, and only one. */
          ...(isOps(s) && !s.hasPortalAccess
            ? [{ label: "Grant portal access", icon: <LockOpen size={16} />, onClick: () => setGranting(s), separatorBefore: true }]
            : []),
          ...(isOps(s) && s.hasPortalAccess
            ? [{ label: "Revoke portal access", icon: <LockOpen size={16} />, onClick: () => setRevoking(s), separatorBefore: true }]
            : []),
          { label: "Remove", icon: <TrashBin size={16} />, onClick: () => setRemoving(s), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="System users and operational staff — roles, availability and assignments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2"><Plus size={18} /> Invite System User</Button>
            <Button onClick={() => { setEditingOps(null); setOpsOpen(true); }} className="gap-2"><Plus size={18} /> Add Operational Staff</Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total staff", value: summary.total },
          { label: "System users", value: summary.system },
          { label: "Operational staff", value: summary.ops },
          { label: "Available now", value: summary.available },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="font-heading text-h2 font-semibold text-foreground">{c.value}</p>
            <p className="text-caption text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Staff type tabs */}
      <div className="mb-4 inline-flex rounded-md border border-border p-0.5">
        {([
          { v: "all", l: "All" },
          { v: "system_user", l: "System Users" },
          { v: "operational_staff", l: "Operational Staff" },
        ] as const).map((t) => (
          <button key={t.v} type="button" onClick={() => setType(t.v)}
            className={cn("rounded px-3 py-1.5 text-body font-medium transition-colors",
              type === t.v ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or job title…" aria-label="Search staff" className="h-10 pl-10" />
        </div>
        <select className={`${selectClass} sm:w-48`} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="all">All departments</option>
          <optgroup label="Operations">
            {OPS_DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABEL[d]}</option>)}
          </optgroup>
          <optgroup label="Platform">
            {SYSTEM_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </optgroup>
        </select>
        <select className={`${selectClass} sm:w-40`} value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filter by availability">
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="on_leave">On leave</option>
        </select>
        <select className={`${selectClass} sm:w-36`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Deactivated</option>
        </select>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(s) => s.id} loading={loading} error={error} onRetry={reload}
        onRowClick={(s) => router.push(`/admin/staff/${s.id}`)}
        emptyTitle="No staff found" emptyDescription="Try adjusting your search or filters." pageSize={10} />

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface-hover/40 p-4">
        <span className="text-muted"><Users size={20} /></span>
        <p className="text-caption text-muted">Click an availability chip to cycle it (available → busy → off). Assignments and performance are on each member’s profile.</p>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={reload} />
      <EditStaffDialog member={editing} onOpenChange={(o) => { if (!o) setEditing(null); }} onDone={reload} />
      <OperationalStaffDialog
        open={opsOpen || !!editingOps}
        onOpenChange={(o) => { if (!o) { setOpsOpen(false); setEditingOps(null); } }}
        editing={editingOps}
        onDone={reload}
      />

      {/* Deactivation warning — active assignments must be reassigned */}
      <Dialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {deactivating?.name}?</DialogTitle>
            <DialogDescription>
              They’ll lose dashboard access and won’t appear in assignment dropdowns.
              {(deactivating?.assignedJobs ?? 0) > 0 && (
                <> This member currently has <span className="font-medium text-foreground">{deactivating?.assignedJobs} job(s)</span> on record — reassign any active work first.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => { if (deactivating) { doDeactivate(deactivating); setDeactivating(null); } }}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog entityId={resetting?.id ?? ""} entityName={resetting?.name ?? ""}
        open={!!resetting} onOpenChange={(o) => !o && setResetting(null)} />
      <GrantPortalAccessDialog member={granting} onOpenChange={(o) => !o && setGranting(null)}
        onDone={reload} />
      <RevokePortalAccessDialog member={revoking} onOpenChange={(o) => !o && setRevoking(null)}
        onDone={reload} />
      <DeleteConfirmation
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        entityLabel={removing && isOps(removing) ? "operational staff" : "staff member"}
        entityName={removing?.name ?? ""}
        description={
          removing && openAssignmentsFor(removing.name) > 0
            ? `${removing.name} has ${openAssignmentsFor(removing.name)} open assignment(s). Removing them will leave these assignments unassigned. This action cannot be undone.`
            : undefined
        }
        onConfirm={async () => {
          if (!removing) return;
          try {
            if (isOps(removing)) {
              const res = await removeOperationalStaff(removing.id);
              toast.success("Operational staff removed", {
                description: res.unassigned ? `${res.unassigned} assignment(s) need reassignment.` : removing.name,
              });
            } else {
              await removeStaff(removing.id);
              toast.success("Staff removed");
            }
            reload();
          } catch { toast.error("Couldn’t remove staff"); }
        }} />
    </div>
  );
}
