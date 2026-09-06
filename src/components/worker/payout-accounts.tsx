"use client";

/**
 * A worker's payout destinations (G1/B4).
 *
 * ⚠️ THE MASKING RULE. A full account number appears in exactly one place in
 * this codebase: the edit form below, while its owner is typing it. Everywhere
 * else — this list, the payout dialog, the admin queue, notifications, toasts,
 * audit entries and exports — goes through `maskAccount()`. If you add a new
 * surface that shows an account, mask it there too.
 *
 * Lives on the worker's own profile because it is their money and their
 * details; an admin can see the masked destination on a request but does not
 * edit it here.
 */
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Plus, PenNib, TrashBin, CheckCircle } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { toast } from "@/components/ui/sonner";
import { useLive } from "@/lib/stores/live";
import {
  accountsFor, saveBankAccount, deleteBankAccount, setPrimaryAccount,
  maskAccount, ACCOUNT_TYPE_LABEL,
} from "@/lib/api/payouts";
import type { Staff, WorkerBankAccount, WorkerAccountType } from "@/lib/mock/types";

const schema = z.object({
  accountType: z.enum(["bank", "mobile_money"]),
  institution: z.string().min(2, "Name the bank or provider"),
  accountName: z.string().min(2, "Enter the name on the account"),
  accountNumber: z.string().min(6, "Enter a valid account or mobile-money number"),
  branch: z.string().optional(),
  isPrimary: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function PayoutAccountsCard({ member, actor }: { member: Staff | undefined; actor: string }) {
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WorkerBankAccount | null>(null);
  const [removing, setRemoving] = React.useState<WorkerBankAccount | null>(null);

  const accounts = React.useMemo(
    () => accountsFor(member?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member?.id, revision],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: "bank", institution: "", accountName: "", accountNumber: "", branch: "", isPrimary: true },
  });
  const accountType = form.watch("accountType") as WorkerAccountType;

  const startAdd = () => {
    setEditing(null);
    form.reset({
      accountType: "bank", institution: "", accountName: member?.name ?? "",
      accountNumber: "", branch: "", isPrimary: accounts.length === 0,
    });
    setOpen(true);
  };

  const startEdit = (a: WorkerBankAccount) => {
    setEditing(a);
    form.reset({
      accountType: a.accountType, institution: a.institution, accountName: a.accountName,
      // The one place the full number is rendered — its owner, editing it.
      accountNumber: a.accountNumber, branch: a.branch ?? "", isPrimary: a.isPrimary,
    });
    setOpen(true);
  };

  const submit = form.handleSubmit(async (v) => {
    if (!member) return;
    try {
      const row = await saveBankAccount({ ...v, id: editing?.id, staffId: member.id }, actor);
      toast.success(editing ? "Account updated" : "Account added", {
        // ⚠️ masked in the toast too — a toast is read over a shoulder.
        description: `${row.institution} ${maskAccount(row.accountNumber)}`,
      });
      setOpen(false);
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t save the account");
    }
  });

  const makeDefault = async (a: WorkerBankAccount) => {
    try {
      await setPrimaryAccount(a.id, actor);
      toast.success("Default payout destination updated", { description: `${a.institution} ${maskAccount(a.accountNumber)}` });
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t update the default");
    }
  };

  return (
    <section aria-labelledby="acct-h">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="acct-h" className="font-heading text-h2 font-semibold text-foreground">Payout accounts</h2>
        <Button size="sm" variant="outline" className="gap-2" onClick={startAdd}><Plus size={16} /> Add</Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={22} />}
          title="No payout account yet"
          description="Add a bank account or mobile-money number so payouts have somewhere to go."
          action={<Button size="sm" onClick={startAdd}>Add an account</Button>}
        />
      ) : (
        <Card className="divide-y divide-border">
          {accounts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
                  {a.institution}
                  {a.isPrimary && <Badge className="border-primary/30 bg-primary/10 text-primary">Default</Badge>}
                </p>
                {/* ⚠️ masked — never the full number in a list. */}
                <p className="text-caption text-muted">
                  {ACCOUNT_TYPE_LABEL[a.accountType]} · {maskAccount(a.accountNumber)} · {a.accountName}
                  {a.branch ? ` · ${a.branch}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!a.isPrimary && (
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => makeDefault(a)}>
                    <CheckCircle size={16} /> Make default
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => startEdit(a)}>
                  <PenNib size={16} /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-muted" onClick={() => setRemoving(a)}>
                  <TrashBin size={16} /> Remove
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit payout account" : "Add a payout account"}</DialogTitle>
              <DialogDescription>
                Payouts are sent here. Only you and the finance team can see it, and it is shown masked everywhere
                except this form.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Field label="Type" htmlFor="ba-type">
                <select id="ba-type" className={selectClass} {...form.register("accountType")}>
                  <option value="bank">Bank account</option>
                  <option value="mobile_money">Mobile money</option>
                </select>
              </Field>
              <Field
                label={accountType === "bank" ? "Bank" : "Provider"}
                htmlFor="ba-inst"
                error={form.formState.errors.institution?.message}
              >
                <Input id="ba-inst" placeholder={accountType === "bank" ? "e.g. Stanbic Bank Uganda" : "e.g. MTN MoMo"} {...form.register("institution")} />
              </Field>
              <Field label="Name on the account" htmlFor="ba-name" error={form.formState.errors.accountName?.message}>
                <Input id="ba-name" {...form.register("accountName")} />
              </Field>
              <Field
                label={accountType === "bank" ? "Account number" : "Mobile-money number"}
                htmlFor="ba-num"
                error={form.formState.errors.accountNumber?.message}
              >
                <Input id="ba-num" inputMode="numeric" autoComplete="off" {...form.register("accountNumber")} />
              </Field>
              {accountType === "bank" && (
                <Field key="branch" label="Branch (optional)" htmlFor="ba-branch">
                  <Input id="ba-branch" {...form.register("branch")} />
                </Field>
              )}
              <label className="flex items-center gap-2 text-body text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...form.register("isPrimary")} />
                Use this as my default payout destination
              </label>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" loading={form.formState.isSubmitting}>{editing ? "Save changes" : "Add account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmation
        open={!!removing}
        onOpenChange={(o) => { if (!o) setRemoving(null); }}
        entityLabel="payout account"
        entityName={removing ? `${removing.institution} ${maskAccount(removing.accountNumber)}` : ""}
        description="Payouts will no longer be sent here. Any request already in progress must be paid first."
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteBankAccount(removing.id, actor);
            toast.success("Account removed");
            setRemoving(null);
            bump();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn’t remove the account");
          }
        }}
      />
    </section>
  );
}
