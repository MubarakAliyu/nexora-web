"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AngleLeft, CheckCircle, Home, GlassWater, Bed, Building, Sun, Lightbulb, DesktopPc, Lock, Download, ArrowRight,
} from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/forms/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatUGX, formatDate } from "@/lib/format";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { downloadPdf } from "@/lib/pdf/download";
import { depositSettlementPdf } from "@/lib/pdf/builders";
import {
  getLeaseDetail, initiateMoveOut, settleMoveOut, staffOptions, tenantName, unitLabel, propertyName,
  type DepositOutcome, type Scope,
} from "@/lib/api/admin";

const STEPS = ["Initiate", "Inspection", "Financial Assessment", "Approve Settlement", "Complete"];

type Condition = "Good" | "Fair" | "Damaged";
interface CatState { key: string; label: string; icon: React.ReactNode; condition: Condition; notes: string; cost: number }

const CATEGORIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "kitchen", label: "Kitchen", icon: <Home size={16} /> },
  { key: "bathroom", label: "Bathroom(s)", icon: <GlassWater size={16} /> },
  { key: "bedrooms", label: "Bedrooms", icon: <Bed size={16} /> },
  { key: "living", label: "Living Areas", icon: <Building size={16} /> },
  { key: "balcony", label: "Balcony / Exterior", icon: <Sun size={16} /> },
  { key: "fixtures", label: "Fixtures & Fittings", icon: <Lightbulb size={16} /> },
  { key: "appliances", label: "Appliances", icon: <DesktopPc size={16} /> },
  { key: "keys", label: "Keys & Access", icon: <Lock size={16} /> },
];

const OUTCOME_LABEL: Record<DepositOutcome, string> = {
  full_refund: "Fully Refunded", partial_refund: "Partially Refunded", deduct: "Deducted", forfeit: "Forfeited",
};

export default function MoveOutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getLeaseDetail(id, scope), [id, scope]);
  const inspectors = React.useMemo(() => staffOptions(), []);

  const [step, setStep] = React.useState(0);
  const [moveOutDate, setMoveOutDate] = React.useState("");
  const [inspectionDate, setInspectionDate] = React.useState("");
  const [inspector, setInspector] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [cats, setCats] = React.useState<CatState[]>(CATEGORIES.map((c) => ({ ...c, condition: "Good", notes: "", cost: 0 })));
  const [inspectorNotes, setInspectorNotes] = React.useState("");
  const [outcome, setOutcome] = React.useState<DepositOutcome>("full_refund");
  const [settlementNote, setSettlementNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ depositStatus: string; refund: number; additionalOwed: number } | null>(null);

  const lease = data?.lease;
  const deposit = lease?.deposit ?? 0;
  const outstandingRent = data?.outstandingRent ?? 0;
  const totalDamage = cats.reduce((s, c) => s + (Number(c.cost) || 0), 0);
  const deductions = totalDamage + outstandingRent;
  const net = deposit - deductions;
  const refund = Math.max(0, net);
  const additionalOwed = Math.max(0, -net);

  // Default the dates + auto-derive an outcome once the lease loads.
  React.useEffect(() => {
    if (lease) {
      setMoveOutDate(lease.end.slice(0, 10));
      setInspectionDate(lease.end.slice(0, 10));
    }
  }, [lease]);
  React.useEffect(() => {
    setOutcome(deductions === 0 ? "full_refund" : refund > 0 ? "partial_refund" : "deduct");
  }, [deductions, refund]);

  const setCat = (i: number, patch: Partial<CatState>) =>
    setCats((cur) => cur.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Card className="p-6"><Skeleton className="h-40 w-full" /></Card></div>;
  if (error || !lease) return <EmptyState title="Lease not found" description={error ?? "We couldn’t load this lease."} action={<Button variant="outline" onClick={reload}>Try again</Button>} />;

  const step1Valid = !!moveOutDate && !!inspectionDate && !!inspector;

  const goInitiate = async () => {
    setBusy(true);
    try {
      await initiateMoveOut(id, { moveOutDate, inspectionDate, inspector, notes });
      toast.success("Move-out initiated", { description: `Inspection scheduled for ${formatDate(inspectionDate)}.` });
      setStep(1);
    } catch { toast.error("Couldn’t initiate move-out"); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true);
    try {
      const damageLines = cats.filter((c) => c.cost > 0).map((c) => ({ category: c.label, cost: Number(c.cost), notes: c.notes || undefined }));
      const res = await settleMoveOut(id, {
        moveOutDate, inspectionDate, inspector, damageLines, totalDamage, outstandingRent, outcome, settlementNote,
      });
      setResult({ depositStatus: res.depositStatus, refund: res.refund, additionalOwed: res.additionalOwed });
      toast.success("Move-out processed", { description: `${tenantName(lease.tenantId)} from ${unitLabel(lease.unitId)}. Deposit: ${OUTCOME_LABEL[outcome]}.` });
      setStep(4);
    } catch { toast.error("Couldn’t process move-out"); }
    finally { setBusy(false); }
  };

  const downloadStatement = () => {
    const { payload, filename } = depositSettlementPdf({
      leaseId: id,
      inspection: cats.map((c) => ({ category: c.label, condition: c.condition, cost: Number(c.cost) || 0, notes: c.notes || undefined })),
      totalDamage, outstandingRent, refund, additionalOwed,
      outcome: OUTCOME_LABEL[outcome], note: settlementNote || undefined,
    });
    downloadPdf(payload, filename);
  };

  const condCount = (c: Condition) => cats.filter((x) => x.condition === c).length;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.push("/admin/leases")} className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-muted transition-colors hover:text-foreground">
        <AngleLeft size={15} /> Back to leases
      </button>

      <PageHeader title="Move-Out & Deposit Settlement" subtitle={`${tenantName(lease.tenantId)} · ${unitLabel(lease.unitId)} · ${propertyName(lease.propertyId)}`} />

      {/* Step indicator */}
      <div className="mb-2 flex items-center gap-1">
        {STEPS.map((s, i) => <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />)}
      </div>
      <p className="mb-5 text-caption text-muted">Step {step + 1} of 5 — {STEPS[step]}</p>

      {/* STEP 1 — initiate */}
      {step === 0 && (
        <Card key="s0" className="space-y-4 p-6 motion-safe:animate-in motion-safe:fade-in">
          <div className="grid gap-3 rounded-xl bg-surface-hover p-4 text-caption sm:grid-cols-2">
            <div><span className="text-muted">Tenant</span><p className="font-medium text-foreground">{tenantName(lease.tenantId)}</p></div>
            <div><span className="text-muted">Unit / property</span><p className="font-medium text-foreground">{unitLabel(lease.unitId)} · {propertyName(lease.propertyId)}</p></div>
            <div><span className="text-muted">Lease dates</span><p className="text-foreground">{formatDate(lease.start)} → {formatDate(lease.end)}</p></div>
            <div><span className="text-muted">Deposit held</span><p className="font-medium text-foreground">{formatUGX(deposit)}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Move-out date" htmlFor="mo-date"><Input id="mo-date" type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} /></Field>
            <Field label="Inspection date" htmlFor="mo-insp"><Input id="mo-insp" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} /></Field>
          </div>
          <Field label="Assign inspector" htmlFor="mo-inspector">
            <select id="mo-inspector" className={selectClass} value={inspector} onChange={(e) => setInspector(e.target.value)}>
              <option value="">Select a staff member…</option>
              {inspectors.map((s) => <option key={s.id} value={s.name}>{s.name}{s.availability !== "available" ? ` (${s.availability})` : ""}</option>)}
            </select>
          </Field>
          <Field label="Notes" htmlFor="mo-notes"><Textarea id="mo-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Tenant has requested early termination" /></Field>
          <div className="flex justify-end">
            <Button onClick={goInitiate} loading={busy} disabled={!step1Valid}>Next</Button>
          </div>
        </Card>
      )}

      {/* STEP 2 — inspection */}
      {step === 1 && (
        <Card key="s1" className="space-y-4 p-6 motion-safe:animate-in motion-safe:fade-in">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inspection date" htmlFor="mo-insp2"><Input id="mo-insp2" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} /></Field>
            <Field label="Inspector" htmlFor="mo-insp-name"><Input id="mo-insp-name" value={inspector} onChange={(e) => setInspector(e.target.value)} /></Field>
          </div>
          <div className="space-y-3">
            {cats.map((c, i) => (
              <div key={c.key} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2 font-medium text-foreground"><span className="text-primary">{c.icon}</span> {c.label}</div>
                <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <div className="flex gap-1.5">
                    {(["Good", "Fair", "Damaged"] as Condition[]).map((cond) => (
                      <button key={cond} type="button" onClick={() => setCat(i, { condition: cond, cost: cond === "Damaged" ? c.cost : 0 })}
                        className={cn("rounded-lg border px-2.5 py-1.5 text-caption font-medium transition-colors",
                          c.condition === cond ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:border-primary/50")}>
                        {cond}
                      </button>
                    ))}
                  </div>
                  <Input value={c.notes} onChange={(e) => setCat(i, { notes: e.target.value })} placeholder="Notes — e.g. scratches on counter" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Estimated repair cost (UGX)" htmlFor={`cost-${c.key}`}>
                    <Input id={`cost-${c.key}`} type="number" value={c.cost} disabled={c.condition !== "Damaged"} onChange={(e) => setCat(i, { cost: Number(e.target.value) })} />
                  </Field>
                  <Field label="Photo" htmlFor={`photo-${c.key}`}>
                    <input id={`photo-${c.key}`} type="file" accept="image/*" className="block w-full text-caption text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-active file:px-3 file:py-1.5 file:text-caption file:text-foreground" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
            <span className="font-medium text-foreground">Total estimated damage</span>
            <span className="font-heading text-h3 font-semibold text-primary">{formatUGX(totalDamage)}</span>
          </div>
          <Field label="Overall inspector notes" htmlFor="mo-onotes"><Textarea id="mo-onotes" rows={2} value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)} /></Field>
          <div className="flex justify-between">
            <Button variant="outline" className="gap-1.5" onClick={() => setStep(0)}><AngleLeft size={16} /> Back</Button>
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </Card>
      )}

      {/* STEP 3 — financial assessment */}
      {step === 2 && (
        <Card key="s2" className="space-y-4 p-6 motion-safe:animate-in motion-safe:fade-in">
          <dl className="divide-y divide-border">
            <div className="flex justify-between py-2.5"><dt className="text-muted">Security deposit held</dt><dd className="font-medium text-foreground">{formatUGX(deposit)}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Total damage cost</dt><dd className="text-foreground">−{formatUGX(totalDamage)}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Outstanding rent</dt><dd className="text-foreground">−{formatUGX(outstandingRent)}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="font-medium text-foreground">Total deductions</dt><dd className="font-medium text-foreground">−{formatUGX(deductions)}</dd></div>
          </dl>
          <div className={cn("rounded-xl border p-4",
            refund > 0 ? "border-border bg-surface-active" : additionalOwed > 0 ? "border-primary/40 bg-primary/10" : "border-primary/30 bg-primary/5")}>
            <p className="text-caption uppercase tracking-wide text-muted">Refund calculation</p>
            <p className={cn("mt-1 font-heading text-h2 font-semibold", additionalOwed > 0 ? "text-primary" : "text-foreground")}>
              {refund > 0 ? `Refund due to tenant: ${formatUGX(refund)}`
                : additionalOwed > 0 ? `Tenant owes additional ${formatUGX(additionalOwed)} beyond deposit`
                : "Deposit fully applied — no refund due"}
            </p>
            <p className="mt-1 text-caption text-muted">{formatUGX(deposit)} deposit − {formatUGX(deductions)} deductions = {net >= 0 ? formatUGX(refund) : `−${formatUGX(additionalOwed)}`}</p>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" className="gap-1.5" onClick={() => setStep(1)}><AngleLeft size={16} /> Back</Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </Card>
      )}

      {/* STEP 4 — approval */}
      {step === 3 && (
        <Card key="s3" className="space-y-4 p-6 motion-safe:animate-in motion-safe:fade-in">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted">Review</p>
            <dl className="space-y-1.5 text-caption">
              <div className="flex justify-between gap-4"><dt className="text-muted">Tenant · unit</dt><dd className="text-right text-foreground">{tenantName(lease.tenantId)} · {unitLabel(lease.unitId)} · {propertyName(lease.propertyId)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Move-out date</dt><dd className="text-foreground">{formatDate(moveOutDate)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Inspection</dt><dd className="text-foreground">{condCount("Good")} Good · {condCount("Fair")} Fair · {condCount("Damaged")} Damaged</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Deposit / deductions</dt><dd className="text-foreground">{formatUGX(deposit)} − {formatUGX(deductions)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Outcome</dt><dd className="font-medium text-foreground">{refund > 0 ? `Refund ${formatUGX(refund)}` : additionalOwed > 0 ? `Owed ${formatUGX(additionalOwed)}` : "No refund"}</dd></div>
            </dl>
          </div>
          <Field label="Deposit outcome" htmlFor="mo-outcome">
            <select id="mo-outcome" className={selectClass} value={outcome} onChange={(e) => setOutcome(e.target.value as DepositOutcome)}>
              <option value="full_refund">Fully Refunded</option>
              <option value="partial_refund">Partially Refunded</option>
              <option value="deduct">Deducted</option>
              <option value="forfeit">Forfeited</option>
            </select>
          </Field>
          <Field label="Settlement note" htmlFor="mo-snote"><Textarea id="mo-snote" rows={2} value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} placeholder="Any note for the settlement statement" /></Field>
          <div className="flex justify-between">
            <Button variant="outline" className="gap-1.5" onClick={() => setStep(2)}><AngleLeft size={16} /> Back</Button>
            <Button size="lg" onClick={approve} loading={busy}>Approve &amp; Process</Button>
          </div>
        </Card>
      )}

      {/* STEP 5 — confirmation */}
      {step === 4 && result && (
        <Card key="s4" className="space-y-5 p-6 text-center motion-safe:animate-in motion-safe:fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary motion-safe:animate-in motion-safe:zoom-in">
            <CheckCircle size={40} />
          </div>
          <div>
            <h2 className="font-heading text-h2 font-semibold text-foreground">Move-out complete</h2>
            <p className="mt-1 text-body text-muted">{tenantName(lease.tenantId)} from {unitLabel(lease.unitId)}, {propertyName(lease.propertyId)}</p>
          </div>
          <div className="mx-auto max-w-sm space-y-1.5 rounded-xl border border-border p-4 text-left text-caption">
            <div className="flex justify-between"><span className="text-muted">Move-out date</span><span className="text-foreground">{formatDate(moveOutDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Deposit outcome</span><span className="font-medium text-foreground">{OUTCOME_LABEL[outcome]}</span></div>
            <div className="flex justify-between"><span className="text-muted">{result.refund > 0 ? "Refund" : result.additionalOwed > 0 ? "Amount owed" : "Settlement"}</span><span className="font-medium text-foreground">{result.refund > 0 ? formatUGX(result.refund) : result.additionalOwed > 0 ? formatUGX(result.additionalOwed) : "—"}</span></div>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button className="gap-2" onClick={downloadStatement}><Download size={18} /> Generate Deposit Settlement Statement</Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push("/admin/leases")}>Return to Leases <ArrowRight size={16} /></Button>
          </div>
        </Card>
      )}
    </div>
  );
}
