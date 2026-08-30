"use client";

/** SCREEN 4 — PROFILE & AVAILABILITY (F4.3). */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRightToBracket, LockOpen, Cog } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session";
import { useLive } from "@/lib/stores/live";
import { formatDate } from "@/lib/format";
import {
  staffForUser, WORKER_TYPE_LABEL, WEEK_DAYS, DAY_LABEL,
  availabilityScheduleFor, saveAvailabilitySchedule, updateWorkerContact,
} from "@/lib/api/worker";
import { AvailabilitySegmented } from "@/components/worker/availability-control";
import type { WorkerDayAvailability } from "@/lib/mock/types";

const contactSchema = z.object({
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  address: z.string().optional(),
});
type ContactValues = z.infer<typeof contactSchema>;

/** 30-minute slots across the working day. */
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const mins = 6 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export default function WorkerProfilePage() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const revision = useLive((s) => s.revision);
  const bump = useLive((s) => s.bump);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const member = React.useMemo(
    () => staffForUser(user?.id, user?.staffId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.staffId, revision, mounted],
  );

  const [schedule, setSchedule] = React.useState<WorkerDayAvailability[]>([]);
  const [savingSchedule, setSavingSchedule] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    if (member) setSchedule(availabilityScheduleFor(member));
  }, [member]);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    values: {
      phone: member?.phone ?? "",
      email: member?.email ?? "",
      address: member?.address ?? "",
    },
  });

  if (!mounted || !member) {
    return <div className="space-y-3"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }

  const saveContact = form.handleSubmit(async (values) => {
    try {
      await updateWorkerContact(member.id, { phone: values.phone, email: values.email, address: values.address });
      toast.success("Details updated");
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your details");
    }
  });

  const setDay = (day: string, patch: Partial<WorkerDayAvailability>) =>
    setSchedule((s) => s.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const copyToAll = () => {
    const monday = schedule.find((d) => d.day === "mon");
    if (!monday) return;
    setSchedule((s) => s.map((d) => ({ ...d, available: monday.available, start: monday.start, end: monday.end })));
    toast.success("Monday's hours copied to every day");
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await saveAvailabilitySchedule(member.id, schedule);
      toast.success("Availability saved", { description: "The office can see your hours when assigning jobs." });
      bump();
    } catch {
      toast.error("Couldn't save your availability");
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-h1 font-semibold text-foreground">Profile</h1>

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">You</h2>
        <dl className="grid gap-2 text-body sm:grid-cols-2">
          <div><dt className="text-caption text-muted">Name</dt><dd className="text-foreground">{member.name}</dd></div>
          <div><dt className="text-caption text-muted">Job title</dt><dd className="text-foreground">{member.jobTitle ?? "Service Worker"}</dd></div>
          <div><dt className="text-caption text-muted">Department</dt><dd className="capitalize text-foreground">{(member.department ?? "").replace(/_/g, " ")}</dd></div>
          <div><dt className="text-caption text-muted">Worker type</dt><dd className="text-foreground">{member.workerType ? WORKER_TYPE_LABEL[member.workerType] : "—"}</dd></div>
          <div><dt className="text-caption text-muted">Started</dt><dd className="text-foreground">{formatDate(member.since)}</dd></div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Your status right now</h2>
        <AvailabilitySegmented member={member} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-h3 font-semibold text-foreground">Contact details</h2>
        <form onSubmit={saveContact} className="space-y-4">
          <Field label="Phone" htmlFor="wp-phone" error={form.formState.errors.phone?.message}>
            <Input id="wp-phone" type="tel" {...form.register("phone")} />
          </Field>
          <Field label="Email" htmlFor="wp-email" error={form.formState.errors.email?.message}>
            <Input id="wp-email" type="email" {...form.register("email")} />
          </Field>
          <Field label="Address" htmlFor="wp-addr" error={form.formState.errors.address?.message}>
            <Input id="wp-addr" {...form.register("address")} />
          </Field>
          <Button type="submit" className="min-h-[48px]" loading={form.formState.isSubmitting}>Save details</Button>
        </form>
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-h3 font-semibold text-foreground">Weekly availability</h2>
          <Button variant="outline" onClick={copyToAll} className="min-h-[40px]">Copy Monday to all</Button>
        </div>
        <p className="mb-3 text-caption text-muted">
          The office uses this when deciding who to send. Keep it current.
        </p>
        <div className="space-y-2">
          {WEEK_DAYS.map((day) => {
            const row = schedule.find((d) => d.day === day);
            if (!row) return null;
            return (
              <div key={day} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`av-${day}`} className="text-body font-medium text-foreground">
                    {DAY_LABEL[day]}
                  </label>
                  <Switch
                    id={`av-${day}`}
                    checked={row.available}
                    onCheckedChange={(v) => setDay(day, { available: v })}
                  />
                </div>
                {row.available && (
                  <div key={`${day}-times`} className="mt-3 grid grid-cols-2 gap-2 motion-safe:animate-in motion-safe:fade-in">
                    <Field label="From" htmlFor={`av-${day}-s`}>
                      <select id={`av-${day}-s`} className={selectClass} value={row.start}
                        onChange={(e) => setDay(day, { start: e.target.value })}>
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="To" htmlFor={`av-${day}-e`}>
                      <select id={`av-${day}-e`} className={selectClass} value={row.end}
                        onChange={(e) => setDay(day, { end: e.target.value })}>
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button className="mt-4 min-h-[48px] w-full sm:w-auto" loading={savingSchedule} onClick={saveSchedule}>
          Save availability
        </Button>
      </Card>

      <Card className="divide-y divide-border">
        <Link href="/change-password" className="flex min-h-[56px] items-center gap-3 p-4 text-body font-medium text-foreground">
          <LockOpen size={18} className="text-muted" /> Change password
        </Link>
        <Link href="/settings" className="flex min-h-[56px] items-center gap-3 p-4 text-body font-medium text-foreground">
          <Cog size={18} className="text-muted" /> Settings
        </Link>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex min-h-[56px] w-full items-center gap-3 p-4 text-left text-body font-medium text-foreground"
        >
          <ArrowRightToBracket size={18} className="text-muted" /> Log out
        </button>
      </Card>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>You&rsquo;ll need to sign in again to see your jobs.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Stay signed in</Button></DialogClose>
            <Button onClick={() => { logout(); router.replace("/login"); }}>Log out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
