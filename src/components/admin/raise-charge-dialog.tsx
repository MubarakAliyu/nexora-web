"use client";

import * as React from "react";
import { formatCurrencyFull } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";
import { CatalogueStep, type CatalogueSelection } from "@/components/marketing/catalogue-step";
import { serviceTypesSync, buildQuotation } from "@/lib/api/catalogue";
import { raiseAdditionalCharge } from "@/lib/api/additional-charges";
import type { ServiceBooking, AdditionalChargeLine, Currency} from "@/lib/mock/types";
import { CurrencyCode } from "@/components/app/currency-code";

const fmt = (n: number, c: Currency = "UGX") => formatCurrencyFull(n, c);

/**
 * Raise an additional charge against an in-progress booking.
 *
 * Two pricing paths, usable together: catalogue items (reusing the SAME generic
 * selector the public booking form uses, so extra work is priced consistently) and
 * a custom amount for genuinely non-standard work. Neither touches the original
 * booking or its accepted quotation.
 */
export function RaiseChargeDialog({ booking, onOpenChange, onDone }: {
  booking: ServiceBooking | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const actor = useSession((s) => s.user?.name ?? "Admin");
  const types = React.useMemo(() => serviceTypesSync(true), []);
  const [serviceTypeId, setServiceTypeId] = React.useState("");
  const [selection, setSelection] = React.useState<CatalogueSelection>({});
  const [description, setDescription] = React.useState("");
  const [justification, setJustification] = React.useState("");
  const [customAmount, setCustomAmount] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!booking) return;
    setServiceTypeId(booking.serviceTypeId ?? types[0]?.id ?? "");
    setSelection({});
    setDescription("");
    setJustification("");
    setCustomAmount("");
    setCustomDescription("");
  }, [booking, types]);

  const lines: AdditionalChargeLine[] = React.useMemo(() => {
    if (!serviceTypeId) return [];
    const sel = Object.entries(selection)
      .filter(([, v]) => v.quantity > 0)
      .map(([itemId, v]) => ({ itemId, quantity: v.quantity, description: v.description }));
    return buildQuotation(serviceTypeId, sel).lines
      .filter((l) => !l.excludedFromTotal)
      .map((l) => ({
        itemId: l.itemId, name: l.name, unit: l.unit,
        quantity: l.quantity, unitPrice: l.unitPriceAtBooking, lineTotal: l.lineTotal,
      }));
  }, [serviceTypeId, selection]);

  const custom = Number(customAmount) || 0;
  const total = lines.reduce((s, l) => s + l.lineTotal, 0) + custom;
  const canSubmit =
    description.trim().length >= 5 && justification.trim().length >= 5 && total > 0 && !!booking;

  const submit = async () => {
    if (!booking || !canSubmit) return;
    setBusy(true);
    try {
      const charge = await raiseAdditionalCharge({
        bookingId: booking.id,
        description: description.trim(),
        justification: justification.trim(),
        items: lines.length ? lines : null,
        customAmount: custom > 0 ? custom : null,
        customDescription: custom > 0 ? customDescription.trim() || null : null,
        raisedBy: actor,
      });
      toast.success("Additional charge sent to customer", {
        description: `${charge.reference} — ${fmt(charge.amount)}`,
      });
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t raise the additional charge"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle>Raise additional charge</DialogTitle>
              <DialogDescription>
                {booking.reference} · {booking.name}. The original booking and its agreed
                quotation are not changed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <Field label="What was discovered?" htmlFor="ac-desc"
                error={description.trim().length >= 5 ? undefined : "Required"}>
                <Textarea id="ac-desc" rows={2} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Kitchen extractor is heavily greased and needs a deep degrease" />
              </Field>
              <Field label="Why is it needed?" htmlFor="ac-just"
                error={justification.trim().length >= 5 ? undefined : "Required"}>
                <Textarea id="ac-just" rows={2} value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g. Standard clean will not shift it; grease is a fire risk" />
              </Field>

              {/* Path A — catalogue items, same selector as the public booking form */}
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-body font-medium text-foreground">Catalogue items</p>
                <Field label="Price from" htmlFor="ac-type">
                  <select id="ac-type" className={selectClass} value={serviceTypeId}
                    onChange={(e) => { setServiceTypeId(e.target.value); setSelection({}); }}>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                {serviceTypeId && (
                  <div className="mt-4">
                    <CatalogueStep serviceTypeId={serviceTypeId} selection={selection} onChange={setSelection} />
                  </div>
                )}
              </div>

              {/* Path B — non-standard work with no catalogue entry */}
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-body font-medium text-foreground">Custom amount</p>
                <p className="mb-3 text-caption text-muted">For work that isn’t in the catalogue.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={<>Amount (<CurrencyCode />)</>} htmlFor="ac-amt">
                    <Input id="ac-amt" type="number" min={0} value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Description" htmlFor="ac-cdesc">
                    <Input id="ac-cdesc" value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)} placeholder="What the amount covers" />
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div>
                  <span className="text-body font-medium text-foreground">Additional charge total</span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {lines.length} catalogue item{lines.length === 1 ? "" : "s"}
                    {custom > 0 ? ` + ${fmt(custom)} custom` : ""}
                  </span>
                </div>
                <span className="font-heading text-h2 font-semibold text-primary">{fmt(total)}</span>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submit} loading={busy} disabled={!canSubmit}>Send to customer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
