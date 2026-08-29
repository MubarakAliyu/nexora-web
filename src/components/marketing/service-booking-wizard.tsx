"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, AngleLeft, CalendarMonth } from "flowbite-react-icons/outline";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import { SectionIcon } from "@/components/marketing/section-icons";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { createServiceBooking, type ServiceBookingKind } from "@/lib/api/rentals";
import { CatalogueStep, validateSelection, type CatalogueSelection } from "@/components/marketing/catalogue-step";
import { QuotationStep } from "@/components/marketing/quotation-step";
import { resolveBookingServiceType, catalogueTree, acceptQuotation, hasBookableItems } from "@/lib/api/catalogue";

/* ------------------------------------------------------------- config */

export interface WizardCategory {
  label: string;
  icon: string; // SectionIcon key
  blurb: string;
  /** Placeholder for the per-category details field (lifestyle). */
  detailsHint?: string;
  /**
   * F2.0 — the catalogue service type this marketing category is priced from,
   * referenced by SLUG (a stable identifier) or id. Explicit, never inferred from
   * the label: matching on a display name silently mis-prices the moment an admin
   * renames anything. A category with no reference, or one that does not resolve
   * to an ACTIVE type, shows the service-unavailable state instead of a price.
   */
  serviceTypeRef?: string;
}

export interface WizardConfig {
  kind: ServiceBookingKind;
  /** Step-2 heading: "Property details" (cleaning) / "Service details" (lifestyle). */
  detailsTitle: string;
  categories: WizardCategory[];
  /** Show property-type + size selects on step 2 (cleaning). */
  propertyFields: boolean;
}

const TIME_SLOTS = ["08:00–10:00", "10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00"];

/* --------------------------------------------------------------- schemas */

const detailsSchema = z.object({
  location: z.string().min(4, "Enter the address / location"),
  propertyType: z.string().optional(),
  size: z.string().optional(),
  details: z.string().optional(),
});
const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
});
type DetailsValues = z.infer<typeof detailsSchema>;
type ContactValues = z.infer<typeof contactSchema>;

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 7 = confirmed

const STEP_LABELS = ["Service", "Details", "Components", "Schedule", "Contact", "Quotation"];

const fmtDay = (d?: Date) =>
  d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";

/* ---------------------------------------------------------------- wizard */

export function ServiceBookingWizard({ config }: { config: WizardConfig }) {
  const [step, setStep] = React.useState<Step>(1);
  const [category, setCategory] = React.useState<WizardCategory | null>(null);
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState<string | undefined>();
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  /* F1 — catalogue-driven component selection and the quotation the customer agrees to. */
  const [selection, setSelection] = React.useState<CatalogueSelection>({});
  const [agreed, setAgreed] = React.useState(false);
  const [quoteTotal, setQuoteTotal] = React.useState("");

  /**
   * F2.0 — resolve strictly by the category's explicit catalogue reference.
   * No name matching and no "first active type" fallback: an unresolved reference
   * must surface as "this service is being updated", never as a price taken from
   * whichever service happened to sort first.
   */
  const serviceTypeId = React.useMemo(
    () => resolveBookingServiceType(category?.serviceTypeRef)?.id ?? "",
    [category],
  );

  const today = React.useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { location: "", propertyType: "", size: "", details: "" },
  });
  const contactForm = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const submit = async () => {
    const d = detailsForm.getValues();
    const c = contactForm.getValues();
    setSubmitting(true);
    try {
      const booking = await createServiceBooking({
        kind: config.kind,
        category: category!.label,
        name: c.name,
        email: c.email,
        phone: c.phone,
        location: d.location,
        propertyType: d.propertyType || undefined,
        size: d.size || undefined,
        details: d.details || undefined,
        date: date!.toISOString(),
        time: time!,
      });
      // F1 — freeze the agreed prices onto the booking. From here the quotation is
      // a snapshot: repricing the catalogue tomorrow must not alter what was agreed.
      const lines = Object.entries(selection)
        .filter(([, v]) => v.quantity > 0)
        .map(([itemId, v]) => ({ itemId, quantity: v.quantity, description: v.description }));
      if (serviceTypeId && lines.length > 0) {
        const quote = await acceptQuotation(booking.id, serviceTypeId, lines);
        setQuoteTotal(`${quote.currency} ${Math.round(quote.total).toLocaleString("en-UG")}`);
      }
      setReference(booking.reference);
      setStep(7);
      toast.success("Quotation accepted — proceed to payment", { description: `Reference ${booking.reference}` });
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const back = (to: Step) => () => setStep(to);

  /* -------------------------------------------------------------- steps */

  let panel: React.ReactNode;

  if (step === 1) {
    panel = (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
        <h3 className="font-heading text-h3 font-semibold text-foreground">Choose a service</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {config.categories.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => { setCategory(c); setStep(2); }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                category?.label === c.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-active text-primary">
                <SectionIcon name={c.icon} size={22} />
              </span>
              <span>
                <span className="block font-medium text-foreground">{c.label}</span>
                <span className="mt-0.5 block text-caption text-muted">{c.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else if (step === 2) {
    panel = (
      <form
        onSubmit={detailsForm.handleSubmit(() => setStep(3))}
        noValidate
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2"
      >
        <button type="button" onClick={back(1)} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
          <AngleLeft size={16} /> Back
        </button>
        <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">{config.detailsTitle}</h3>
        <p className="mt-1 text-caption text-muted">{category?.label}</p>
        <div className="mt-4 space-y-4">
          <Field label="Address / location" htmlFor="sw-loc" error={detailsForm.formState.errors.location?.message}>
            <Input id="sw-loc" placeholder="e.g. Plot 12, Kololo, Kampala" {...detailsForm.register("location")} aria-invalid={!!detailsForm.formState.errors.location} />
          </Field>
          {config.propertyFields && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property type" htmlFor="sw-ptype">
                <select id="sw-ptype" className={selectClass} {...detailsForm.register("propertyType")}>
                  <option value="">Select…</option>
                  <option>Apartment</option>
                  <option>House</option>
                  <option>Office</option>
                  <option>Retail</option>
                  <option>Facility / venue</option>
                </select>
              </Field>
              <Field label="Approximate size" htmlFor="sw-size">
                <select id="sw-size" className={selectClass} {...detailsForm.register("size")}>
                  <option value="">Select…</option>
                  <option>1–2 rooms</option>
                  <option>3–4 rooms</option>
                  <option>5+ rooms</option>
                  <option>Under 100 m²</option>
                  <option>100–500 m²</option>
                  <option>500+ m²</option>
                </select>
              </Field>
            </div>
          )}
          <Field label={config.propertyFields ? "Anything we should know? (optional)" : "Service details"} htmlFor="sw-details">
            <Textarea
              id="sw-details"
              rows={3}
              placeholder={category?.detailsHint ?? "Tell us more about what you need…"}
              {...detailsForm.register("details")}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit">Continue</Button>
        </div>
      </form>
    );
  } else if (step === 3) {
    const problems = validateSelection(catalogueTree(serviceTypeId, true), selection);
    const bookable = serviceTypeId ? hasBookableItems(serviceTypeId) : false;
    panel = (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
        <button type="button" onClick={back(2)} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
          <AngleLeft size={16} /> Back
        </button>
        <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">What do you need?</h3>
        <p className="mt-1 text-caption text-muted">Tell us the scope so we can price it before we start.</p>
        <div className="mt-5">
          <CatalogueStep
            serviceTypeId={serviceTypeId}
            selection={selection}
            onChange={(next) => { setSelection(next); setAgreed(false); }}
          />
        </div>
        {problems.length > 0 && (
          <ul className="mt-4 space-y-1">
            {problems.map((p) => <li key={p} className="text-caption text-primary">{p}</li>)}
          </ul>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            disabled={!bookable || problems.length > 0 || Object.keys(selection).length === 0}
            onClick={() => setStep(4)}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  } else if (step === 4) {
    panel = (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
        <button type="button" onClick={back(3)} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
          <AngleLeft size={16} /> Back
        </button>
        <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Preferred date &amp; time</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-[auto_1fr]">
          <div className="rounded-xl border border-border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { setDate(d); setTime(undefined); }}
              disabled={[{ before: today }]}
              showOutsideDays={false}
            />
          </div>
          <div className="min-w-0">
            {!date ? (
              <div className="flex h-full min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                <CalendarMonth size={26} className="text-muted" />
                <p className="mt-2 text-body text-muted">Pick a day to choose a time slot.</p>
              </div>
            ) : (
              <div key={date.toISOString()} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
                <p className="text-caption font-medium text-foreground">{fmtDay(date)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
                  {TIME_SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      aria-pressed={time === s}
                      className={cn(
                        "rounded-lg border py-2.5 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        time === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:border-primary hover:text-primary",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button disabled={!date || !time} onClick={() => setStep(5)}>Continue</Button>
        </div>
      </div>
    );
  } else if (step === 5) {
    panel = (
      <form
        onSubmit={contactForm.handleSubmit(() => setStep(6))}
        noValidate
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2"
      >
        <button type="button" onClick={back(4)} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
          <AngleLeft size={16} /> Back
        </button>
        <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Contact details</h3>
        <div className="mt-4 space-y-4">
          <Field label="Full name" htmlFor="sw-name" error={contactForm.formState.errors.name?.message}>
            <Input id="sw-name" {...contactForm.register("name")} aria-invalid={!!contactForm.formState.errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="sw-email" error={contactForm.formState.errors.email?.message}>
              <Input id="sw-email" type="email" {...contactForm.register("email")} aria-invalid={!!contactForm.formState.errors.email} />
            </Field>
            <Field label="Phone" htmlFor="sw-phone" error={contactForm.formState.errors.phone?.message}>
              <Input id="sw-phone" type="tel" {...contactForm.register("phone")} aria-invalid={!!contactForm.formState.errors.phone} />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit">Review booking</Button>
        </div>
      </form>
    );
  } else if (step === 6) {
    const d = detailsForm.getValues();
    const c = contactForm.getValues();
    panel = (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
        <button type="button" onClick={back(5)} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary">
          <AngleLeft size={16} /> Back
        </button>
        <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">Review your booking</h3>
        <dl className="mt-4 space-y-3 rounded-xl border border-border p-5 text-body">
          <div className="flex justify-between gap-4"><dt className="text-muted">Service</dt><dd className="text-right font-medium text-foreground">{category?.label}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Location</dt><dd className="text-right text-foreground">{d.location}</dd></div>
          {d.propertyType && <div className="flex justify-between gap-4"><dt className="text-muted">Property</dt><dd className="text-right text-foreground">{d.propertyType}{d.size ? ` · ${d.size}` : ""}</dd></div>}
          {d.details && <div className="flex justify-between gap-4"><dt className="text-muted">Details</dt><dd className="max-w-[60%] text-right text-foreground">{d.details}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-muted">Date</dt><dd className="text-right text-foreground">{fmtDay(date)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Time</dt><dd className="text-right text-foreground">{time}</dd></div>
          <div className="flex justify-between gap-4 border-t border-border pt-3"><dt className="text-muted">Contact</dt><dd className="text-right text-foreground">{c.name} · {c.phone}</dd></div>
        </dl>
        <div className="mt-6">
          <QuotationStep
            serviceTypeId={serviceTypeId}
            selection={selection}
            agreed={agreed}
            onAgreedChange={setAgreed}
            address={d.location}
            dateLabel={fmtDay(date)}
            time={time}
          />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} loading={submitting} disabled={!agreed}>Accept &amp; Continue to Payment</Button>
        </div>
      </div>
    );
  } else {
    panel = (
      <div className="flex flex-col items-center py-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle size={36} className="text-primary" />
        </span>
        <h3 className="mt-5 font-heading text-h2 font-semibold text-foreground">Booking received</h3>
        <p className="mt-2 max-w-sm text-body text-muted">
          Your {category?.label.toLowerCase()} booking is in{quoteTotal ? " and your quotation is agreed" : ""}.
          {quoteTotal ? " We’ll take payment next, then schedule the visit." : " Our team will confirm the visit shortly."}
        </p>
        <div className="mt-5 w-full max-w-sm space-y-2 rounded-xl border border-border bg-surface-hover p-4 text-left text-body">
          <div className="flex justify-between"><span className="text-muted">Reference</span><span className="font-semibold text-foreground">{reference}</span></div>
          <div className="flex justify-between"><span className="text-muted">Service</span><span className="text-foreground">{category?.label}</span></div>
          <div className="flex justify-between"><span className="text-muted">When</span><span className="text-foreground">{fmtDay(date)} · {time}</span></div>
          {quoteTotal && <div className="flex justify-between border-t border-border pt-2"><span className="text-muted">Agreed total</span><span className="font-semibold text-primary">{quoteTotal}</span></div>}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/services">Explore services</Link></Button>
          <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- shell */

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
      {step !== 7 && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-hover px-5 py-3">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <span className={cn("flex items-center gap-1.5 text-caption font-medium", i + 1 <= step ? "text-primary" : "text-muted")}>
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  i + 1 < step ? "bg-primary text-primary-foreground" : i + 1 === step ? "border border-primary text-primary" : "border border-border text-muted",
                )}>
                  {i + 1}
                </span>
                <span className="hidden md:inline">{label}</span>
              </span>
              {i < STEP_LABELS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="p-5 md:p-8">{panel}</div>
    </div>
  );
}
