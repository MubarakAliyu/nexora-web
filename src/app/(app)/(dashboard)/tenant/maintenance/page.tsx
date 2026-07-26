"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdjustmentsHorizontal, Plus, CheckCircle, Clock, Image as ImageIcon, MessageDots } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, PriorityBadge } from "@/components/app/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/forms/field";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { useSession } from "@/lib/stores/session";
import { formatDate, fromNow } from "@/lib/format";
import { getTenant, createTicket, NOW_ISO, type MaintenanceTicket, type TicketCategory, type TicketPriority, type Scope } from "@/lib/api/admin";

type Tab = "maintenance" | "complaints";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "plumbing", label: "Plumbing" }, { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "Heating / Cooling" }, { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" }, { value: "security", label: "Security" },
  { value: "cleaning", label: "Cleaning" }, { value: "other", label: "Other" },
];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const STEPS: { key: string; label: string }[] = [
  { key: "open", label: "Submitted" },
  { key: "assigned", label: "Assigned to technician" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];
const ORDER: Record<string, number> = { open: 0, assigned: 1, in_progress: 2, completed: 3, closed: 3 };

function TicketDetailDialog({ ticket, onOpenChange }: { ticket: MaintenanceTicket | null; onOpenChange: (o: boolean) => void }) {
  const current = ticket ? ORDER[ticket.status] ?? 0 : 0;
  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{ticket.ref} <StatusBadge status={ticket.status} /></DialogTitle>
              <DialogDescription>{ticket.title}</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-body">
              <div className="flex justify-between"><dt className="text-muted">Category</dt><dd className="capitalize text-foreground">{ticket.category}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Priority</dt><dd><PriorityBadge priority={ticket.priority} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Submitted</dt><dd className="text-foreground">{formatDate(ticket.createdAt)}</dd></div>
              {ticket.assignee && <div className="flex justify-between"><dt className="text-muted">Technician</dt><dd className="text-foreground">{ticket.assignee}</dd></div>}
            </dl>
            <p className="rounded-lg bg-surface-hover p-3 text-body text-muted">{ticket.description}</p>
            <div>
              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-muted">Status timeline</p>
              <Timeline>
                {STEPS.map((s, i) => (
                  <TimelineItem key={s.key} title={s.label} icon={i <= current ? <CheckCircle size={11} /> : <Clock size={11} />}
                    time={i === current ? fromNow(ticket.updatedAt, NOW_ISO) : ""}>
                    <span className={cn("text-caption", i <= current ? "text-primary" : "text-muted")}>{i < current ? "Done" : i === current ? "Current" : "Pending"}</span>
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  title: z.string().min(4, "Describe the issue briefly"),
  category: z.string().min(1, "Choose a category"),
  priority: z.string().min(1),
  description: z.string().min(10, "Add a few details (10+ characters)"),
});
type Values = z.infer<typeof schema>;

export default function TenantMaintenancePage() {
  const user = useSession((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const { data, loading, error, reload } = useAsync(() => getTenant(tenantId, scope), [tenantId, scope]);
  const [tab, setTab] = React.useState<Tab>("maintenance");
  const [detail, setDetail] = React.useState<MaintenanceTicket | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", priority: "medium", description: "" },
  });

  const isComplaint = tab === "complaints";

  const onSubmit = async (v: Values) => {
    if (!data?.unit) { toast.error("No unit on file"); return; }
    try {
      await createTicket({
        unitId: data.unit.id,
        title: isComplaint ? `Complaint: ${v.title}` : v.title,
        description: v.description,
        category: (isComplaint ? "other" : v.category) as TicketCategory,
        priority: v.priority as TicketPriority,
      });
      toast.success(isComplaint ? "Complaint submitted" : "Request submitted", { description: "Our team will review it shortly." });
      reset({ title: "", category: "", priority: "medium", description: "" });
      reload();
    } catch {
      toast.error("Couldn’t submit", { description: "Please try again." });
    }
  };

  if (loading && !data) {
    return <div><Skeleton className="h-6 w-40" /><Skeleton className="mt-4 h-64 w-full rounded-xl" /></div>;
  }
  if (error || !data) {
    return <EmptyState icon={<AdjustmentsHorizontal size={22} />} title="Couldn’t load requests" description={error ?? "Please try again."} action={<Button variant="outline" size="sm" onClick={reload}>Try again</Button>} />;
  }

  const allTickets = data.tickets;
  const complaints = allTickets.filter((t) => t.title.startsWith("Complaint:"));
  const maintenance = allTickets.filter((t) => !t.title.startsWith("Complaint:"));
  const rows = isComplaint ? complaints : maintenance;

  const columns: Column<MaintenanceTicket>[] = [
    { key: "ref", header: "Ref", sortable: true, render: (t) => <span className="font-medium text-foreground">{t.ref}</span> },
    { key: "title", header: "Subject", render: (t) => t.title.replace(/^Complaint:\s*/, "") },
    ...(!isComplaint ? [{ key: "category", header: "Category", render: (t: MaintenanceTicket) => <span className="capitalize">{t.category}</span> } as Column<MaintenanceTicket>] : []),
    { key: "priority", header: "Priority", render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: "createdAt", header: "Submitted", sortable: true, align: "right", render: (t) => formatDate(t.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Maintenance & Requests" subtitle="Report issues and track them to resolution" />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-md border border-border p-0.5">
        {(["maintenance", "complaints"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); reset({ title: "", category: "", priority: "medium", description: "" }); }}
            className={cn("inline-flex items-center gap-1.5 rounded px-4 py-1.5 text-body font-medium capitalize transition-colors", tab === t ? "bg-surface-active text-foreground" : "text-muted hover:text-foreground")}>
            {t === "maintenance" ? <AdjustmentsHorizontal size={16} /> : <MessageDots size={16} />}
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Submit form */}
        <Card className="h-fit p-6">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Plus size={20} className="text-primary" /> {isComplaint ? "Raise a complaint" : "New maintenance request"}</h2>
          <p className="mb-4 text-caption text-muted">{data.unit?.label} · {data.property?.name}</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label={isComplaint ? "Subject" : "Issue"} htmlFor="mr-title" error={errors.title?.message}>
              <Input id="mr-title" placeholder={isComplaint ? "e.g. Noise from neighbouring unit" : "e.g. Leaking kitchen tap"} {...register("title")} aria-invalid={!!errors.title} />
            </Field>
            {!isComplaint && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category" htmlFor="mr-cat" error={errors.category?.message}>
                  <select id="mr-cat" className={selectClass} {...register("category")} aria-invalid={!!errors.category}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority" htmlFor="mr-pri">
                  <select id="mr-pri" className={selectClass} {...register("priority")}>
                    {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </Field>
              </div>
            )}
            <Field label={isComplaint ? "Details" : "Description"} htmlFor="mr-desc" error={errors.description?.message}>
              <Textarea id="mr-desc" rows={4} placeholder={isComplaint ? "Tell us what happened…" : "Describe the issue and where it is…"} {...register("description")} aria-invalid={!!errors.description} />
            </Field>
            {/* Photo upload placeholder */}
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-muted">
              <ImageIcon size={22} />
              <div><p className="text-body font-medium text-foreground">Attach photos</p><p className="text-caption">Drag & drop or browse (mocked in this build)</p></div>
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>{isComplaint ? "Submit complaint" : "Submit request"}</Button>
          </form>
        </Card>

        {/* List */}
        <div>
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">{isComplaint ? "Your complaints" : "Your requests"}</h2>
          <DataTable columns={columns} data={rows} getRowId={(t) => t.id} onRowClick={(t) => setDetail(t)}
            emptyTitle={isComplaint ? "No complaints" : "No requests yet"} emptyDescription={isComplaint ? "Raise a complaint and track it here." : "Submit a maintenance request and track it here."} pageSize={8} />
        </div>
      </div>

      <TicketDetailDialog ticket={detail} onOpenChange={(o) => !o && setDetail(null)} />

      <div className="mt-8">
        <Link href="/tenant" className="text-body font-medium text-primary transition-colors hover:text-accent">← Back to dashboard</Link>
      </div>
    </div>
  );
}
