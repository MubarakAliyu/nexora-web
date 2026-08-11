"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DateRange } from "react-day-picker";
import { CheckCircle, AngleLeft, CreditCard, MobilePhone, Landmark } from "flowbite-react-icons/outline";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatUGX } from "@/lib/format";
import { createBooking, type RentalDetail, type RentalListing } from "@/lib/api/rentals";
import type { Unit } from "@/lib/mock/types";

const guestSchema = z.object({
  name: z.string().min(2, "Enter the lead guest's name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
  adults: z.number().int().min(1, "At least 1 adult"),
  children: z.number().int().min(0),
  specialRequests: z.string().optional(),
});
type GuestValues = z.infer<typeof guestSchema>;

type Step = "dates" | "guests" | "summary" | "payment" | "confirmed";

const PAYMENTS = [
  { id: "flutterwave", label: "Flutterwave", Icon: CreditCard, hint: "Card & bank" },
  { id: "mobile_money", label: "Mobile Money", Icon: MobilePhone, hint: "MTN / Airtel" },
  { id: "card", label: "Debit / Credit Card", Icon: Landmark, hint: "Visa / Mastercard" },
];

function nightsBetween(from?: Date, to?: Date) {
  if (!from || !to) return 0;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}
const fmtDay = (d?: Date) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function RentalBookingFlow({
  property,
  units,
  bookedRanges,
}: {
  property: RentalListing;
  units: Unit[];
  bookedRanges: RentalDetail["bookedRanges"];
}) {
  const [step, setStep] = React.useState<Step>("dates");
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [unitId, setUnitId] = React.useState<string>(units[0]?.id ?? "");
  const [payment, setPayment] = React.useState<string>("");
  const [reference, setReference] = React.useState<string>("");

  const today = React.useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const st = property.shortTerm!;
  const nights = nightsBetween(range?.from, range?.to);
  const subtotal = st.daily * nights + st.cleaningFee;
  const taxes = Math.round((subtotal * 0.18) / 1000) * 1000;
  const total = subtotal + taxes;
  const minStay = property.minStay ?? 1;
  const datesValid = nights >= minStay;

  const disabled = React.useMemo(
    () => [
      { before: today },
      ...bookedRanges.map((r) => ({ from: new Date(r.from), to: new Date(r.to) })),
    ],
    [today, bookedRanges],
  );

  const {
    register, handleSubmit, getValues, formState: { errors },
  } = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: "", email: "", phone: "", adults: 2, children: 0, specialRequests: "" },
  });

  const goSummary = () => setStep("summary");

  const pay = async () => {
    const g = getValues();
    const selectedUnit = units.find((u) => u.id === unitId);
    try {
      const booking = await createBooking({
        propertyId: property.id,
        unitId: selectedUnit?.id,
        guestName: g.name,
        guestEmail: g.email,
        guestPhone: g.phone,
        adults: g.adults,
        children: g.children,
        specialRequests: g.specialRequests,
        checkIn: range!.from!.toISOString(),
        checkOut: range!.to!.toISOString(),
        paymentMethod: payment,
      });
      setReference(booking.reference);
      setStep("confirmed");
      toast.success("Booking confirmed", { description: `Reference ${booking.reference}` });
    } catch {
      toast.error("Payment failed", { description: "Please try again." });
    }
  };

  const stepIndex = { dates: 1, guests: 2, summary: 3, payment: 4, confirmed: 5 }[step];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      {/* Progress header */}
      {step !== "confirmed" && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-hover px-5 py-3">
          {["Dates", "Guests", "Summary", "Payment"].map((label, i) => (
            <React.Fragment key={label}>
              <span className={cn("flex items-center gap-1.5 text-caption font-medium", i + 1 <= stepIndex ? "text-primary" : "text-muted")}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px]", i + 1 < stepIndex ? "bg-primary text-primary-foreground" : i + 1 === stepIndex ? "border border-primary text-primary" : "border border-border text-muted")}>
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {i < 3 && <span className="h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="p-5 md:p-6">
        {/* Step 1: dates */}
        {step === "dates" && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
            {units.length > 1 && (
              <div className="mb-4">
                <label htmlFor="bk-unit" className="mb-1.5 block text-caption font-medium text-foreground">Choose a unit</label>
                <select id="bk-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-body">
                  {units.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.type}</option>)}
                </select>
              </div>
            )}
            <h3 className="font-heading text-h3 font-semibold text-foreground">Select your dates</h3>
            <p className="mt-1 text-caption text-muted">Minimum stay {minStay} night{minStay > 1 ? "s" : ""}. Unavailable dates are disabled.</p>
            <div className="mt-4 flex justify-center rounded-xl border border-border">
              <Calendar mode="range" selected={range} onSelect={setRange} disabled={disabled} showOutsideDays={false} numberOfMonths={1} />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-hover px-4 py-3 text-body">
              <span className="text-muted">{fmtDay(range?.from)} → {fmtDay(range?.to)}</span>
              <span className="font-medium text-foreground">{nights} night{nights === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-5 flex justify-end">
              <Button disabled={!datesValid} onClick={() => setStep("guests")}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 2: guests */}
        {step === "guests" && (
          <form
            onSubmit={handleSubmit(goSummary)}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2"
            noValidate
          >
            <button type="button" onClick={() => setStep("dates")} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
              <AngleLeft size={16} /> Back
            </button>
            <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Guest details</h3>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lead guest name" htmlFor="bk-name" error={errors.name?.message}>
                  <Input id="bk-name" {...register("name")} aria-invalid={!!errors.name} />
                </Field>
                <Field label="Email" htmlFor="bk-email" error={errors.email?.message}>
                  <Input id="bk-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Phone" htmlFor="bk-phone" error={errors.phone?.message}>
                  <Input id="bk-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
                </Field>
                <Field label="Adults" htmlFor="bk-adults" error={errors.adults?.message}>
                  <Input id="bk-adults" type="number" min={1} {...register("adults", { valueAsNumber: true })} />
                </Field>
                <Field label="Children" htmlFor="bk-children" error={errors.children?.message}>
                  <Input id="bk-children" type="number" min={0} {...register("children", { valueAsNumber: true })} />
                </Field>
              </div>
              <Field label="Special requests (optional)" htmlFor="bk-req">
                <Textarea id="bk-req" rows={3} {...register("specialRequests")} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit">Continue</Button>
            </div>
          </form>
        )}

        {/* Step 3: summary */}
        {step === "summary" && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
            <button type="button" onClick={() => setStep("guests")} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
              <AngleLeft size={16} /> Back
            </button>
            <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Booking summary</h3>
            <div className="mt-4 rounded-xl border border-border">
              <div className="border-b border-border p-4">
                <p className="font-medium text-foreground">{property.name}</p>
                <p className="text-caption text-muted">{property.location}</p>
                <p className="mt-2 text-caption text-muted">{fmtDay(range?.from)} → {fmtDay(range?.to)} · {nights} nights</p>
              </div>
              <dl className="space-y-2 p-4 text-body">
                <div className="flex justify-between"><dt className="text-muted">{formatUGX(st.daily)} × {nights} nights</dt><dd className="text-foreground">{formatUGX(st.daily * nights)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Cleaning fee</dt><dd className="text-foreground">{formatUGX(st.cleaningFee)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Taxes (18%)</dt><dd className="text-foreground">{formatUGX(taxes)}</dd></div>
                <div className="mt-2 flex justify-between border-t border-border pt-3"><dt className="font-heading font-semibold text-foreground">Total</dt><dd className="font-heading text-h3 font-semibold text-primary">{formatUGX(total)}</dd></div>
              </dl>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setStep("payment")}>Continue to payment</Button>
            </div>
          </div>
        )}

        {/* Step 4: payment */}
        {step === "payment" && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
            <button type="button" onClick={() => setStep("summary")} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
              <AngleLeft size={16} /> Back
            </button>
            <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Payment</h3>
            <p className="mt-1 text-caption text-muted">This is a simulated payment — no real charge is made.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PAYMENTS.map(({ id, label, Icon, hint }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPayment(id)}
                  aria-pressed={payment === id}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    payment === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <Icon size={22} className={payment === id ? "text-primary" : "text-muted"} />
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-caption text-muted">{hint}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-body text-muted">Total <span className="font-heading text-h3 font-semibold text-primary">{formatUGX(total)}</span></span>
              <Button disabled={!payment} onClick={pay}>Pay {formatUGX(total)}</Button>
            </div>
          </div>
        )}

        {/* Step 5: confirmation */}
        {step === "confirmed" && (
          <div className="flex flex-col items-center py-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle size={36} className="text-primary" />
            </span>
            <h3 className="mt-5 font-heading text-h2 font-semibold text-foreground">Booking confirmed</h3>
            <p className="mt-2 max-w-sm text-body text-muted">Your stay at {property.name} is booked. A confirmation has been sent to your email.</p>
            <div className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-border bg-surface-hover p-4 text-left text-body">
              <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-semibold text-foreground">{reference}</span></div>
              <div className="flex justify-between"><span className="text-muted">Dates</span><span className="text-foreground">{fmtDay(range?.from)} → {fmtDay(range?.to)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Property</span><span className="text-foreground">{property.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total paid</span><span className="font-semibold text-foreground">{formatUGX(total)}</span></div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/rentals">Browse more rentals</Link></Button>
              <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
