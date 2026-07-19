"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Clock,
  VideoCamera,
  MapPin,
  CheckCircle,
  AngleLeft,
  CalendarMonth,
} from "flowbite-react-icons/outline";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { submitLead } from "@/lib/api/leads";
import { Field, selectClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------- meeting info */

const covered = [
  "Your property, portfolio size and management goals",
  "The services that fit — rental, facility, condo or full management",
  "A transparent, tailored fee proposal",
  "Onboarding timeline and next steps",
];

/* -------------------------------------------------------------- time slots */

/** Office hours: Mon–Fri 09:00–17:00, Sat 09:00–13:30, Sun closed. */
function slotsForDate(date: Date): string[] {
  const day = date.getDay();
  if (day === 0) return [];
  const end = day === 6 ? 13.5 : 17;
  const out: string[] = [];
  for (let t = 9; t < end; t += 0.5) {
    const h = Math.floor(t);
    const m = t % 1 ? "30" : "00";
    out.push(`${String(h).padStart(2, "0")}:${m}`);
  }
  return out;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* -------------------------------------------------------------- details form */

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a contact number"),
  propertyType: z.string().min(1, "Select a property type"),
  message: z.string().min(10, "Tell us about your property (10+ characters)"),
});
type Values = z.infer<typeof schema>;

type Step = "select" | "details" | "confirmed";

export function QuoteScheduler() {
  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select");
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState<string | undefined>();

  React.useEffect(() => setMounted(true), []);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const slots = date ? slotsForDate(date) : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { propertyType: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await submitLead({
        type: "quote",
        name: v.name,
        email: v.email,
        phone: v.phone,
        message: v.message,
        meta: {
          propertyType: v.propertyType,
          preferredDate: date ? formatLongDate(date) : undefined,
          preferredTime: time,
        },
      });
      setStep("confirmed");
      reset();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    }
  };

  /* ---------------------------------------------------------- left / info */

  const info = (
    <div className="flex flex-col border-b border-border p-6 md:border-b-0 md:border-r md:p-8 lg:w-[38%]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-hover">
          <Image src="/brand/icon-mark.png" alt="" width={525} height={543} className="h-7 w-auto" />
        </span>
        <span className="text-caption font-medium uppercase tracking-[0.2em] text-muted">
          Nexora
        </span>
      </div>

      <h2 className="mt-6 font-heading text-h2 font-semibold leading-tight text-foreground">
        Request a Quote Consultation
      </h2>
      <p className="mt-3 text-body leading-relaxed text-muted">
        A free, no-obligation call with a Nexora advisor to scope your needs and prepare a
        tailored proposal.
      </p>

      <ul className="mt-6 space-y-3 text-body text-foreground">
        <li className="flex items-center gap-3">
          <Clock size={18} className="shrink-0 text-primary" />
          <span>30 minutes</span>
        </li>
        <li className="flex items-center gap-3">
          <VideoCamera size={18} className="shrink-0 text-primary" />
          <span>Video call or phone</span>
        </li>
        <li className="flex items-center gap-3">
          <MapPin size={18} className="shrink-0 text-primary" />
          <span>Kampala, Uganda &middot; EAT (GMT+3)</span>
        </li>
      </ul>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-caption font-medium uppercase tracking-[0.15em] text-muted">
          What we&rsquo;ll cover
        </p>
        <ul className="mt-4 space-y-2.5">
          {covered.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-body text-foreground">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  /* ---------------------------------------------------------- right / panel */

  let panel: React.ReactNode;

  if (!mounted) {
    panel = (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-72 w-full animate-pulse rounded-xl bg-surface-hover" />
      </div>
    );
  } else if (step === "select") {
    panel = (
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <h3 className="font-heading text-h3 font-semibold text-foreground">Select a date &amp; time</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Calendar */}
          <div className="rounded-xl border border-border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setTime(undefined);
              }}
              disabled={[{ before: today }, { dayOfWeek: [0] }]}
              showOutsideDays={false}
            />
          </div>

          {/* Time slots */}
          <div className="min-w-0">
            {!date ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                <CalendarMonth size={26} className="text-muted" />
                <p className="mt-2 text-body text-muted">Pick a day to see available times.</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-body text-muted">
                  We&rsquo;re closed on Sundays. Please choose another day.
                </p>
              </div>
            ) : (
              <div key={date.toISOString()} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
                <p className="text-caption font-medium text-foreground">
                  {formatLongDate(date)}
                </p>
                <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-2">
                  {slots.map((s) => (
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

        <div className="mt-8 flex justify-end">
          <Button disabled={!date || !time} onClick={() => setStep("details")}>
            Continue
          </Button>
        </div>
      </div>
    );
  } else if (step === "details") {
    panel = (
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <button
          type="button"
          onClick={() => setStep("select")}
          className="inline-flex items-center gap-1.5 self-start text-caption font-medium text-muted transition-colors hover:text-primary"
        >
          <AngleLeft size={16} /> Back
        </button>

        {date && time && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-hover px-4 py-3">
            <CalendarMonth size={20} className="shrink-0 text-primary" />
            <p className="text-body font-medium text-foreground">
              {formatLongDate(date)} &middot; {time} EAT
            </p>
          </div>
        )}

        <h3 className="mt-6 font-heading text-h3 font-semibold text-foreground">Your details</h3>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="s-name" error={errors.name?.message}>
              <Input id="s-name" {...register("name")} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Email" htmlFor="s-email" error={errors.email?.message}>
              <Input id="s-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="s-phone" error={errors.phone?.message}>
              <Input id="s-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            </Field>
            <Field label="Property type" htmlFor="s-type" error={errors.propertyType?.message}>
              <select
                id="s-type"
                className={selectClass}
                aria-invalid={!!errors.propertyType}
                {...register("propertyType")}
              >
                <option value="">Select&hellip;</option>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Condominium</option>
                <option>Institutional</option>
                <option>Managed facility</option>
              </select>
            </Field>
          </div>
          <Field label="About your property" htmlFor="s-message" error={errors.message?.message}>
            <Textarea id="s-message" rows={4} {...register("message")} aria-invalid={!!errors.message} />
          </Field>
          <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting}>
            Confirm request
          </Button>
        </form>
      </div>
    );
  } else {
    panel = (
      <div
        key="confirmed"
        className="flex flex-1 flex-col items-center justify-center p-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle size={36} className="text-primary" />
        </span>
        <h3 className="mt-6 font-heading text-h2 font-semibold text-foreground">
          You&rsquo;re all set
        </h3>
        <p className="mt-2 max-w-md text-body text-muted">
          Your quote consultation is requested. We&rsquo;ll confirm by email and send a calendar
          invite shortly.
        </p>
        {date && time && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface-hover px-5 py-3">
            <CalendarMonth size={20} className="shrink-0 text-primary" />
            <p className="text-body font-medium text-foreground">
              {formatLongDate(date)} &middot; {time} EAT
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/services">Explore services</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
      <div className="flex flex-col md:flex-row">
        {info}
        {panel}
      </div>
    </div>
  );
}
