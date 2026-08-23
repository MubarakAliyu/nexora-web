"use client";

import * as React from "react";
import { ExclamationCircle, ArrowsRepeat } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { resetMockData } from "@/lib/mock/persistence";
import { useLive } from "@/lib/stores/live";
import { useAudit } from "@/lib/stores/audit";
import { useSession } from "@/lib/stores/session";

/**
 * ⚠️ MOCK-LAYER CONTROL — removed with lib/mock/persistence.ts when the backend lands.
 * Clears the persisted demo data (DB + notifications + audit) and re-seeds from the
 * pristine snapshot. Super Admin only.
 */
export function ResetDemoData() {
  const role = useSession((s) => s.user?.role);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (role !== "super_admin") return null;

  const reset = async () => {
    setBusy(true);
    resetMockData();
    useAudit.getState().clear();
    useLive.getState().bump();
    toast.success("Demo data reset", { description: "All records restored to their original state." });
    setOpen(false);
    setBusy(false);
    // Re-read the current view against the freshly seeded data.
    window.location.reload();
  };

  return (
    <Card className="mt-6 max-w-2xl p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-primary"><ExclamationCircle size={20} /></span>
        <div className="flex-1">
          <h3 className="font-heading text-h3 font-semibold text-foreground">Demo data</h3>
          <p className="mt-1 text-body text-muted">
            Records created while testing are saved in this browser. Reset to restore the
            original seeded demo data.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setOpen(true)}>
            <ArrowsRepeat size={18} /> Reset Demo Data
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription>
              Reset all demo data to its original state? Any records created during testing
              will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={reset} loading={busy}>Reset demo data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
