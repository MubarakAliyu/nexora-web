"use client";

import * as React from "react";
import { Plus, PenNib, TrashBin } from "flowbite-react-icons/outline";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { useAsync } from "@/lib/use-async";
import { listRoles, createRole, updateRole, deleteRole, PERMISSION_MODULES, type RoleDef, type PermissionSet } from "@/lib/api/admin";

const MODULE_LABELS: Record<string, string> = {
  properties: "Properties", units: "Units", tenants: "Tenants", owners: "Owners", leases: "Leases",
  finance: "Finance", maintenance: "Maintenance", crm: "CRM", analytics: "Analytics", settings: "Settings", staff: "Staff",
};

function emptyPerms(): Record<string, PermissionSet> {
  const out: Record<string, PermissionSet> = {};
  for (const m of PERMISSION_MODULES) out[m] = { read: false, write: false };
  return out;
}
function summarize(p: Record<string, PermissionSet>): string {
  const rw = PERMISSION_MODULES.filter((m) => p[m]?.write).length;
  const ro = PERMISSION_MODULES.filter((m) => p[m]?.read && !p[m]?.write).length;
  return `${rw} read/write · ${ro} read-only`;
}

function RoleFormDialog({ open, onOpenChange, editing, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: RoleDef | null; onDone: () => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [permissions, setPermissions] = React.useState<Record<string, PermissionSet>>(emptyPerms());
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setPermissions(editing ? JSON.parse(JSON.stringify(editing.permissions)) : emptyPerms());
      setErr(null);
    }
  }, [open, editing]);

  const toggle = (m: string, kind: "read" | "write") =>
    setPermissions((prev) => {
      const next = { ...prev, [m]: { ...prev[m] } };
      next[m][kind] = !next[m][kind];
      if (kind === "write" && next[m].write) next[m].read = true; // write implies read
      if (kind === "read" && !next[m].read) next[m].write = false;
      return next;
    });

  const save = async () => {
    if (name.trim().length < 2) { setErr("Enter a role name"); return; }
    setBusy(true);
    try {
      if (isEdit && editing) { await updateRole(editing.id, { name, description, permissions }); toast.success("Role updated", { description: name }); }
      else { await createRole({ name, description, permissions }); toast.success("Role created", { description: name }); }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t save role"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit role" : "Create a role"}</DialogTitle>
          <DialogDescription>Set the module permissions for this role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role name" htmlFor="rl-name" error={err ?? undefined}><Input id="rl-name" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} disabled={editing?.system} /></Field>
            <Field label="Description" htmlFor="rl-desc"><Input id="rl-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1fr,auto,auto] items-center gap-4 border-b border-border bg-surface-hover px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-muted">
              <span>Module</span><span>Read</span><span>Write</span>
            </div>
            <div className="divide-y divide-border">
              {PERMISSION_MODULES.map((m) => (
                <div key={m} className="grid grid-cols-[1fr,auto,auto] items-center gap-4 px-4 py-2.5">
                  <span className="text-body text-foreground">{MODULE_LABELS[m]}</span>
                  <Checkbox checked={permissions[m]?.read} onCheckedChange={() => toggle(m, "read")} aria-label={`${MODULE_LABELS[m]} read`} />
                  <Checkbox checked={permissions[m]?.write} onCheckedChange={() => toggle(m, "write")} aria-label={`${MODULE_LABELS[m]} write`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} loading={busy}>{isEdit ? "Save changes" : "Create role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RolesTab() {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RoleDef | null>(null);
  const [deleting, setDeleting] = React.useState<RoleDef | null>(null);
  const { data, loading, error, reload } = useAsync(() => listRoles(), []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-body text-muted">System roles and their module permissions.</p>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus size={18} /> Create role</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState title="Couldn’t load roles" description={error} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-h3 font-semibold text-foreground">{r.name}</h3>
                    {r.system && <Badge variant="muted">System</Badge>}
                  </div>
                  <p className="mt-1 text-body text-muted">{r.description}</p>
                </div>
                <RowActions actions={[
                  { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditing(r); setFormOpen(true); } },
                  { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(r), danger: true, separatorBefore: true },
                ]} />
              </div>
              <div className="mt-3 flex items-center justify-between text-caption">
                <span className="text-muted">{summarize(r.permissions)}</span>
                <Badge variant="secondary">{r.members} member{r.members === 1 ? "" : "s"}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onDone={reload} />
      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="role" entityName={deleting?.name ?? ""}
        description="This cannot be undone. Users with this role will lose its permissions."
        onConfirm={async () => { if (!deleting) return; try { await deleteRole(deleting.id); toast.success("Role deleted"); reload(); } catch { toast.error("Couldn’t delete role"); } }} />
    </div>
  );
}
