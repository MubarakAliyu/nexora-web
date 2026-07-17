"use client";

import * as React from "react";
import { Users, Plus, PenNib, TrashBin } from "flowbite-react-icons/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import { listStaff, inviteStaff, updateStaff, removeStaff, type Staff, type Scope } from "@/lib/api/admin";
import { adminRoles, roleLabels, type Role } from "@/lib/roles";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const inviteSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  role: z.string().min(1, "Choose a role"),
  department: z.string().optional(),
});
type InviteValues = z.infer<typeof inviteSchema>;

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", role: "property_manager", department: "" },
  });
  React.useEffect(() => { if (open) reset({ name: "", email: "", role: "property_manager", department: "" }); }, [open, reset]);
  const onSubmit = async (v: InviteValues) => {
    try { await inviteStaff({ name: v.name, email: v.email, role: v.role as Role, department: v.department }); toast.success("Invitation sent", { description: `${v.name} was invited as ${roleLabels[v.role as Role]}.` }); onOpenChange(false); onDone(); }
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
            <Field label="Department (optional)" htmlFor="st-dep"><Input id="st-dep" {...register("department")} /></Field>
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
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (member) { setRole(member.role); setStatus(member.status); } }, [member]);
  const save = async () => {
    if (!member) return;
    setBusy(true);
    try { await updateStaff(member.id, { role, status }); toast.success("Staff updated", { description: `${member.name} saved.` }); onOpenChange(false); onDone(); }
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

export default function StaffPage() {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Staff | null>(null);
  const [removing, setRemoving] = React.useState<Staff | null>(null);
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
    { key: "department", header: "Department", render: (s) => s.department ?? <span className="text-muted">—</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "since", header: "Joined", sortable: true, align: "right", render: (s) => formatDate(s.since) },
    {
      key: "actions", header: "", align: "right",
      render: (s) => (
        <RowActions actions={[
          { label: "Edit", icon: <PenNib size={16} />, onClick: () => setEditing(s) },
          { label: s.status === "suspended" ? "Reactivate" : "Deactivate", onClick: async () => { try { await updateStaff(s.id, { status: s.status === "suspended" ? "active" : "suspended" }); toast.success(s.status === "suspended" ? "Reactivated" : "Deactivated", { description: s.name }); reload(); } catch { toast.error("Couldn’t update"); } } },
          { label: "Remove", icon: <TrashBin size={16} />, onClick: () => setRemoving(s), danger: true, separatorBefore: true },
        ]} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Internal team members, roles and access"
        actions={<Button onClick={() => setInviteOpen(true)} className="gap-2"><Plus size={18} /> Invite</Button>}
      />

      <DataTable columns={columns} data={data ?? []} getRowId={(s) => s.id} loading={loading} error={error} onRetry={reload}
        emptyTitle="No staff yet" emptyDescription="Invite your first team member." pageSize={10} />

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface-hover/40 p-4">
        <span className="text-muted"><Users size={20} /></span>
        <p className="text-caption text-muted">Granular per-module permissions and activity logs per user arrive in Phase 2. Role-based access is configured under Settings → Roles &amp; Permissions.</p>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={reload} />
      <EditStaffDialog member={editing} onOpenChange={(o) => { if (!o) setEditing(null); }} onDone={reload} />
      <DeleteConfirmation open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} entityLabel="staff member" entityName={removing?.name ?? ""}
        onConfirm={async () => { if (!removing) return; try { await removeStaff(removing.id); toast.success("Staff removed"); reload(); } catch { toast.error("Couldn’t remove staff"); } }} />
    </div>
  );
}
