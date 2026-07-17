"use client";

import * as React from "react";
import { ExclamationCircle } from "flowbite-react-icons/outline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Reusable delete confirmation. Always warns "This action cannot be undone."
 * Used for every destructive action across the admin. Runs `onConfirm` (which
 * should call a mutation → toast + notification + audit) then closes.
 */
export function DeleteConfirmation({
  open,
  onOpenChange,
  entityName,
  entityLabel = "item",
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityName: string;
  entityLabel?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ExclamationCircle size={24} />
          </span>
          <DialogTitle>Delete {entityLabel}?</DialogTitle>
          <DialogDescription>
            You’re about to delete <span className="font-medium text-foreground">{entityName}</span>.{" "}
            {description ?? "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={run} loading={busy} className="bg-primary hover:bg-primary/90">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
