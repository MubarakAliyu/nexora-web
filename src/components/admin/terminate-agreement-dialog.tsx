"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { terminateAgreement, type ManagementAgreement } from "@/lib/api/agreements";

export function TerminateAgreementDialog({
  agreement, onOpenChange, onDone,
}: {
  agreement: ManagementAgreement | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState(today);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (agreement) { setDate(today); setReason(""); } }, [agreement, today]);

  const run = async () => {
    if (!agreement) return;
    setBusy(true);
    try {
      await terminateAgreement(agreement.id, date, reason || "No reason provided");
      toast.success("Agreement terminated", { description: `${agreement.ownerName}.` });
      onOpenChange(false);
      onDone();
    } catch {
      toast.error("Couldn’t terminate agreement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!agreement} onOpenChange={onOpenChange}>
      <DialogContent>
        {agreement && (
          <>
            <DialogHeader>
              <DialogTitle>Terminate Agreement</DialogTitle>
              <DialogDescription>
                This will end the management agreement with {agreement.ownerName}. A new agreement must be created before future settlements can be processed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="Termination date" htmlFor="term-date">
                <Input id="term-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Reason" htmlFor="term-reason">
                <Textarea id="term-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this agreement being terminated?" />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button onClick={run} loading={busy} className="bg-primary hover:bg-primary/90">Terminate</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
