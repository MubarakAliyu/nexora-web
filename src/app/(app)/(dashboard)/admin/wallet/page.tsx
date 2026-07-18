"use client";

import * as React from "react";
import { Wallet, ArrowUp, ArrowDown, Clock, Plus, PenNib, TrashBin, CheckCircle } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { AreaChart } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, selectClass } from "@/components/forms/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatUGXFull, formatDate } from "@/lib/format";
import {
  getWallet, listTransactions, listBankAccounts, ownerOptions,
  withdrawFunds, sendFunds, addBankAccount, updateBankAccount, deleteBankAccount, setPrimaryAccount,
  type WalletTx, type BankAccount, type Scope,
} from "@/lib/api/admin";

const mask = (n: string) => `•••• ${n.slice(-4)}`;
const isIncoming = (t: WalletTx["type"]) => t === "deposit" || t === "refund";

/* ---------------------------------------------------------- withdraw */

function WithdrawDialog({ open, onOpenChange, balance, banks, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; balance: number; banks: BankAccount[]; onDone: () => void;
}) {
  const [step, setStep] = React.useState<"form" | "review">("form");
  const [amount, setAmount] = React.useState("");
  const [bankId, setBankId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (open) { setStep("form"); setAmount(""); setBankId(banks[0]?.id ?? ""); setNote(""); setErr(null); } }, [open, banks]);

  const amt = Number(amount);
  const toReview = () => {
    if (!amt || amt < 100000) { setErr("Minimum withdrawal is UGX 100,000"); return; }
    if (amt > balance) { setErr("Amount exceeds available balance"); return; }
    if (!bankId) { setErr("Choose a destination account"); return; }
    setErr(null); setStep("review");
  };
  const confirm = async () => {
    setBusy(true);
    try { await withdrawFunds({ amount: amt, bankId, note }); toast.success("Withdrawal initiated", { description: `${formatUGX(amt)} to your bank.` }); onOpenChange(false); onDone(); }
    catch { toast.error("Withdrawal failed"); }
    finally { setBusy(false); }
  };
  const bank = banks.find((b) => b.id === bankId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw funds</DialogTitle>
          <DialogDescription>Available balance: <span className="font-medium text-foreground">{formatUGXFull(balance)}</span></DialogDescription>
        </DialogHeader>
        {step === "form" ? (
          <div className="space-y-4">
            <Field label="Amount (UGX)" htmlFor="wd-amt" error={err ?? undefined}>
              <Input id="wd-amt" type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(null); }} placeholder="0" />
            </Field>
            <Field label="Destination account" htmlFor="wd-bank">
              <select id="wd-bank" className={selectClass} value={bankId} onChange={(e) => setBankId(e.target.value)}>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.bankName} · {mask(b.accountNumber)}</option>)}
              </select>
            </Field>
            <Field label="Note (optional)" htmlFor="wd-note"><Input id="wd-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={toReview}>Review</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <dl className="space-y-2.5 text-body">
                <div className="flex justify-between gap-4"><dt className="text-muted">Amount</dt><dd className="font-heading text-h3 font-semibold text-foreground">{formatUGXFull(amt)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">To</dt><dd className="text-foreground">{bank?.bankName} {mask(bank?.accountNumber ?? "")}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Balance after</dt><dd className="text-foreground">{formatUGX(balance - amt)}</dd></div>
              </dl>
            </Card>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")}>Back</Button>
              <Button onClick={confirm} loading={busy}>Confirm withdrawal</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------- send funds */

function SendDialog({ open, onOpenChange, balance, owners, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; balance: number; owners: { id: string; name: string }[]; onDone: () => void;
}) {
  const [ownerId, setOwnerId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setOwnerId(owners[0]?.id ?? ""); setAmount(""); setReference(""); setNote(""); setErr(null); } }, [open, owners]);
  const amt = Number(amount);
  const submit = async () => {
    if (!ownerId) { setErr("Choose a recipient"); return; }
    if (!amt || amt < 50000) { setErr("Enter a valid amount"); return; }
    if (amt > balance) { setErr("Amount exceeds available balance"); return; }
    setBusy(true);
    try {
      const owner = owners.find((o) => o.id === ownerId);
      await sendFunds({ ownerId, amount: amt, reference, note });
      toast.success(`Funds sent to ${owner?.name}`, { description: formatUGX(amt) });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t send funds"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send funds (disbursement)</DialogTitle><DialogDescription>Available: <span className="font-medium text-foreground">{formatUGXFull(balance)}</span></DialogDescription></DialogHeader>
        <div className="space-y-4">
          <Field label="Recipient (owner)" htmlFor="sf-owner">
            <select id="sf-owner" className={selectClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Amount (UGX)" htmlFor="sf-amt" error={err ?? undefined}><Input id="sf-amt" type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(null); }} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reference (optional)" htmlFor="sf-ref"><Input id="sf-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
            <Field label="Note (optional)" htmlFor="sf-note"><Input id="sf-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button onClick={submit} loading={busy}>Send funds</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------- bank form */

const bankSchema = z.object({
  bankName: z.string().min(2, "Enter a bank name"),
  accountNumber: z.string().regex(/^\d{6,}$/, "Enter a valid account number"),
  accountName: z.string().min(2, "Enter the account name"),
  branch: z.string().min(2, "Enter a branch"),
  swift: z.string().min(4, "Enter a SWIFT code"),
});
type BankValues = z.infer<typeof bankSchema>;

function BankFormDialog({ open, onOpenChange, editing, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: BankAccount | null; onDone: () => void;
}) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BankValues>({
    resolver: zodResolver(bankSchema), defaultValues: { bankName: "", accountNumber: "", accountName: "", branch: "", swift: "" },
  });
  React.useEffect(() => {
    if (open) reset(editing
      ? { bankName: editing.bankName, accountNumber: editing.accountNumber, accountName: editing.accountName, branch: editing.branch, swift: editing.swift }
      : { bankName: "", accountNumber: "", accountName: "", branch: "", swift: "" });
  }, [open, editing, reset]);
  const onSubmit = async (v: BankValues) => {
    try {
      if (isEdit && editing) { await updateBankAccount(editing.id, v); toast.success("Bank account updated"); }
      else { await addBankAccount(v); toast.success("Bank account added"); }
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t save account"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit bank account" : "Add bank account"}</DialogTitle><DialogDescription>Used for withdrawals and disbursements.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank name" htmlFor="bk-name" error={errors.bankName?.message}><Input id="bk-name" {...register("bankName")} aria-invalid={!!errors.bankName} /></Field>
            <Field label="Account name" htmlFor="bk-acctname" error={errors.accountName?.message}><Input id="bk-acctname" {...register("accountName")} aria-invalid={!!errors.accountName} /></Field>
            <Field label="Account number" htmlFor="bk-acct" error={errors.accountNumber?.message}><Input id="bk-acct" type={isEdit ? "password" : "text"} inputMode="numeric" {...register("accountNumber")} aria-invalid={!!errors.accountNumber} /></Field>
            <Field label="Branch" htmlFor="bk-branch" error={errors.branch?.message}><Input id="bk-branch" {...register("branch")} aria-invalid={!!errors.branch} /></Field>
            <Field label="SWIFT code" htmlFor="bk-swift" error={errors.swift?.message}><Input id="bk-swift" {...register("swift")} aria-invalid={!!errors.swift} /></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{isEdit ? "Save changes" : "Add account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- page */

export default function WalletPage() {
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const wallet = useAsync(() => getWallet(scope), [scope]);
  const owners = React.useMemo(() => ownerOptions(), []);

  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);

  const banksState = useAsync(() => listBankAccounts(scope), [scope]);
  const banks = banksState.data ?? [];

  const [txType, setTxType] = React.useState("all");
  const [txStatus, setTxStatus] = React.useState("all");
  const tx = useAsync(() => listTransactions({ type: txType, status: txStatus }, scope), [txType, txStatus, scope]);

  const [bankForm, setBankForm] = React.useState(false);
  const [editingBank, setEditingBank] = React.useState<BankAccount | null>(null);
  const [deletingBank, setDeletingBank] = React.useState<BankAccount | null>(null);

  const reloadAll = () => { wallet.reload(); tx.reload(); banksState.reload(); };

  const txColumns: Column<WalletTx>[] = [
    { key: "date", header: "Date", sortable: true, render: (t) => formatDate(t.date) },
    { key: "type", header: "Type", sortable: true, render: (t) => <span className="capitalize">{t.type}</span> },
    { key: "description", header: "Description", render: (t) => <span className="text-muted">{t.description}</span> },
    { key: "reference", header: "Reference", render: (t) => <span className="text-muted">{t.reference}</span> },
    {
      key: "amount", header: "Amount", sortable: true, align: "right",
      render: (t) => (
        <span className={isIncoming(t.type) ? "font-medium text-foreground" : "font-medium text-primary"}>
          {isIncoming(t.type) ? "+" : "−"}{formatUGX(t.amount)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Wallet"
        subtitle="Balance, transactions and disbursements"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setSendOpen(true)}><ArrowUp size={18} /> Send funds</Button>
            <Button className="gap-2" onClick={() => setWithdrawOpen(true)}><ArrowDown size={18} /> Withdraw</Button>
          </div>
        }
      />

      {/* KPIs */}
      {wallet.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-4 w-20" /><Skeleton className="mt-3 h-8 w-28" /></Card>)}</div>
      ) : wallet.error ? (
        <EmptyState icon={<Wallet size={22} />} title="Couldn’t load wallet" description={wallet.error} action={<Button variant="outline" size="sm" onClick={wallet.reload}>Try again</Button>} />
      ) : wallet.data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Current balance" value={<span>UGX <CountUp to={wallet.data.balance / 1_000_000} decimals={1} immediate />M</span>} icon={<Wallet size={22} />} />
            <StatCard label="Total received" value={formatUGX(wallet.data.received)} icon={<ArrowDown size={22} />} />
            <StatCard label="Total withdrawn" value={formatUGX(wallet.data.withdrawn)} icon={<ArrowUp size={22} />} />
            <StatCard label="Pending" value={formatUGX(wallet.data.pending)} icon={<Clock size={22} />} hint="awaiting settlement" />
          </div>
          <Card className="mt-4 p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-h3 font-semibold text-foreground">Balance trend</h2><span className="text-caption text-muted">UGX M · last 6 months</span></div>
            <AreaChart data={wallet.data.trend.map((d) => ({ month: d.label, balance: d.value }))} xKey="month" series={[{ key: "balance", label: "Balance" }]} height={240} />
          </Card>
        </>
      ) : null}

      <div className="mt-6">
        <Tabs defaultValue="transactions">
          <div className="overflow-x-auto"><TabsList><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="banking">Banking details</TabsTrigger></TabsList></div>

          <TabsContent value="transactions">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <select className={`${selectClass} sm:w-44`} value={txType} onChange={(e) => setTxType(e.target.value)} aria-label="Filter by type">
                <option value="all">All types</option><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option>
                <option value="disbursement">Disbursement</option><option value="fee">Fee</option><option value="refund">Refund</option>
              </select>
              <select className={`${selectClass} sm:w-40`} value={txStatus} onChange={(e) => setTxStatus(e.target.value)} aria-label="Filter by status">
                <option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
              </select>
            </div>
            <DataTable columns={txColumns} data={tx.data ?? []} getRowId={(t) => t.id} loading={tx.loading} error={tx.error} onRetry={tx.reload}
              emptyTitle="No transactions" emptyDescription="Wallet activity will appear here." pageSize={10} />
          </TabsContent>

          <TabsContent value="banking">
            <div className="mb-4 flex justify-end"><Button onClick={() => { setEditingBank(null); setBankForm(true); }} className="gap-2"><Plus size={18} /> Add bank account</Button></div>
            {banksState.loading ? (
              <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
            ) : banks.length === 0 ? (
              <EmptyState title="No bank accounts" description="Add an account to enable withdrawals." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {banks.map((b) => (
                  <Card key={b.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2"><h3 className="font-heading text-h3 font-semibold text-foreground">{b.bankName}</h3>{b.primary ? <Badge variant="secondary">Primary</Badge> : <Badge variant="muted">Secondary</Badge>}</div>
                        <p className="mt-1 font-mono text-body text-foreground">{mask(b.accountNumber)}</p>
                        <p className="text-caption text-muted">{b.accountName} · {b.branch} · {b.swift}</p>
                      </div>
                      <RowActions actions={[
                        ...(!b.primary ? [{ label: "Set as primary", icon: <CheckCircle size={16} />, onClick: async () => { try { await setPrimaryAccount(b.id); toast.success("Primary account set", { description: b.bankName }); reloadAll(); } catch { toast.error("Couldn’t update"); } } }] : []),
                        { label: "Edit", icon: <PenNib size={16} />, onClick: () => { setEditingBank(b); setBankForm(true); } },
                        { label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeletingBank(b), danger: true, separatorBefore: true },
                      ]} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={wallet.data?.balance ?? 0} banks={banks} onDone={reloadAll} />
      <SendDialog open={sendOpen} onOpenChange={setSendOpen} balance={wallet.data?.balance ?? 0} owners={owners} onDone={reloadAll} />
      <BankFormDialog open={bankForm} onOpenChange={setBankForm} editing={editingBank} onDone={reloadAll} />
      <DeleteConfirmation open={!!deletingBank} onOpenChange={(o) => !o && setDeletingBank(null)} entityLabel="bank account" entityName={deletingBank ? `${deletingBank.bankName} ${mask(deletingBank.accountNumber)}` : ""}
        onConfirm={async () => { if (!deletingBank) return; try { await deleteBankAccount(deletingBank.id); toast.success("Bank account removed"); reloadAll(); } catch { toast.error("Couldn’t remove account"); } }} />
    </div>
  );
}
