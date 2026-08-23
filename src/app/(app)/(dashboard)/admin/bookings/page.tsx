"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, ArrowRight } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ExportCsvButton } from "@/components/app/export-csv-button";
import { StatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatUGX, formatDate } from "@/lib/format";
import { listProperties } from "@/lib/api/admin";
import {
  listBookingRows, getBookingDetail, updateBookingStatus, updateInquiryStage,
  createBooking, getRentalDetail, listRentals,
  type AdminBookingRow, type BookingDetail, type InquiryStage,
} from "@/lib/api/rentals";

const SHORT_ACTIONS: { status: "confirmed" | "checked_in" | "checked_out" | "cancelled"; label: string }[] = [
  { status: "confirmed", label: "Confirm" },
  { status: "checked_in", label: "Check In" },
  { status: "checked_out", label: "Check Out" },
  { status: "cancelled", label: "Cancel" },
];
const STAGE_ACTIONS: { stage: InquiryStage; label: string }[] = [
  { stage: "contacted", label: "Mark Contacted" },
  { stage: "quoted", label: "Send Quote" },
  { stage: "converted", label: "Convert" },
  { stage: "lost", label: "Mark Lost" },
];

/* ------------------------------------------------------------- detail dialog */

function BookingDetailDialog({ id, onOpenChange, onDone }: { id: string | null; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { data, loading, reload } = useAsync(() => (id ? getBookingDetail(id) : Promise.resolve(null as unknown as BookingDetail)), [id]);
  const [busy, setBusy] = React.useState(false);

  const changeShort = async (status: "confirmed" | "checked_in" | "checked_out" | "cancelled") => {
    if (!id) return;
    setBusy(true);
    try { await updateBookingStatus(id, status); toast.success("Booking updated"); reload(); onDone(); }
    catch { toast.error("Couldn’t update booking"); }
    finally { setBusy(false); }
  };
  const changeStage = async (stage: InquiryStage) => {
    if (!id) return;
    setBusy(true);
    try { await updateInquiryStage(id, stage); toast.success("Inquiry updated"); reload(); onDone(); }
    catch { toast.error("Couldn’t update inquiry"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {loading || !data ? (
          <div className="space-y-3 py-6"><div className="h-6 w-40 animate-pulse rounded bg-surface-hover" /><div className="h-24 w-full animate-pulse rounded bg-surface-hover" /></div>
        ) : data.kind === "short-term" && data.booking ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{data.booking.reference} <Badge variant="muted">Short-term</Badge></DialogTitle>
              <DialogDescription>{data.propertyName}{data.booking.unitLabel ? ` · ${data.booking.unitLabel}` : ""}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-hover px-4 py-3">
                <span className="text-caption text-muted">Status</span><StatusBadge status={data.booking.status} />
              </div>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between"><dt className="text-muted">Booking type</dt><dd className="text-foreground">Short-term stay</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Guest</dt><dd className="text-foreground">{data.booking.guestName}</dd></div>
                {data.booking.customerId && <div className="flex justify-between"><dt className="text-muted">Customer ID</dt><dd className="font-mono text-caption text-foreground">{data.booking.customerId}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Contact</dt><dd className="text-foreground">{data.booking.guestEmail} · {data.booking.guestPhone}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Property · unit</dt><dd className="text-right text-foreground">{data.propertyName}{data.booking.unitLabel ? ` · ${data.booking.unitLabel}` : ""}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Guests</dt><dd className="text-foreground">{data.booking.adults} adults · {data.booking.children} children</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Check-in → out</dt><dd className="text-foreground">{formatDate(data.booking.checkIn)} → {formatDate(data.booking.checkOut)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Duration</dt><dd className="text-foreground">{data.booking.nights} night{data.booking.nights === 1 ? "" : "s"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Date created</dt><dd className="text-foreground">{formatDate(data.booking.createdAt)}</dd></div>
                {data.booking.specialRequests && <div className="flex justify-between gap-6"><dt className="text-muted">Requests</dt><dd className="text-right text-foreground">{data.booking.specialRequests}</dd></div>}
              </dl>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Price breakdown</p>
                <dl className="space-y-1.5 text-body">
                  <div className="flex justify-between"><dt className="text-muted">{formatUGX(data.booking.nightlyRate)} × {data.booking.nights} nights</dt><dd className="text-foreground">{formatUGX(data.booking.nightlyRate * data.booking.nights)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Cleaning</dt><dd className="text-foreground">{formatUGX(data.booking.cleaningFee)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Taxes</dt><dd className="text-foreground">{formatUGX(data.booking.taxes)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-1.5 font-semibold"><dt className="text-foreground">Total</dt><dd className="text-primary">{formatUGX(data.booking.total)}</dd></div>
                </dl>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Payment</p>
                <dl className="space-y-1.5 text-body">
                  <div className="flex items-center justify-between"><dt className="text-muted">Payment status</dt><dd><StatusBadge status={data.booking.paymentStatus ?? "pending"} /></dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="capitalize text-foreground">{(data.booking.paymentMethod ?? "—").replace(/_/g, " ")}</dd></div>
                  {data.booking.paymentReference && <div className="flex justify-between"><dt className="text-muted">Transaction ref</dt><dd className="font-mono text-caption text-foreground">{data.booking.paymentReference}</dd></div>}
                  {data.booking.paidAt && <div className="flex justify-between"><dt className="text-muted">Paid on</dt><dd className="text-foreground">{formatDate(data.booking.paidAt)}</dd></div>}
                </dl>
              </div>
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Change status</p>
                <div className="flex flex-wrap gap-2">
                  {SHORT_ACTIONS.map((a) => (
                    <Button key={a.status} size="sm" variant={a.status === "cancelled" ? "outline" : "secondary"} disabled={busy || data.booking!.status === a.status} onClick={() => changeShort(a.status)}>{a.label}</Button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : data.lead ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{data.lead.name} <Badge variant="muted">Long-term inquiry</Badge></DialogTitle>
              <DialogDescription>{data.propertyName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-surface-hover px-4 py-3">
                <span className="text-caption text-muted">Stage</span><StatusBadge status={data.stage ?? "new"} />
              </div>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between"><dt className="text-muted">Contact</dt><dd className="text-foreground">{data.lead.email} · {data.lead.phone}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Enquired</dt><dd className="text-foreground">{formatDate(data.lead.createdAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Est. value</dt><dd className="text-foreground">{formatUGX(data.lead.value)}</dd></div>
                {data.lead.activities.filter((a) => a.kind === "note").map((a) => (
                  <div key={a.id} className="flex justify-between gap-6"><dt className="text-muted">Details</dt><dd className="text-right text-foreground">{a.text}</dd></div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted">Advance stage</p>
                <div className="flex flex-wrap gap-2">
                  {STAGE_ACTIONS.map((a) => (
                    <Button key={a.stage} size="sm" variant={a.stage === "lost" ? "outline" : "secondary"} disabled={busy} onClick={() => changeStage(a.stage)}>{a.label}</Button>
                  ))}
                </div>
              </div>
              <Link href={`/admin/leads/${data.lead.id}`} className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:text-accent">
                Open CRM lead <ArrowRight size={16} />
              </Link>
            </div>
          </>
        ) : null}
        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- add booking */

const addSchema = z.object({
  propertyId: z.string().min(1, "Choose a property"),
  unitId: z.string().optional(),
  guestName: z.string().min(2, "Enter a guest name"),
  guestEmail: z.string().email("Enter a valid email"),
  guestPhone: z.string().min(7, "Enter a phone"),
  checkIn: z.string().min(1, "Check-in date"),
  checkOut: z.string().min(1, "Check-out date"),
});
type AddValues = z.infer<typeof addSchema>;

function AddBookingDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const shortProps = useAsync(() => listRentals({ rentalType: "short-term" }), []);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { propertyId: "", unitId: "", guestName: "", guestEmail: "", guestPhone: "", checkIn: "", checkOut: "" },
  });
  const propertyId = watch("propertyId");
  const detail = useAsync(() => (propertyId ? getRentalDetail(propertyId) : Promise.resolve(null as never)), [propertyId]);

  React.useEffect(() => { if (open) reset(); }, [open, reset]);

  const onSubmit = async (v: AddValues) => {
    try {
      await createBooking({ ...v, adults: 2, children: 0, paymentMethod: "manual" });
      toast.success("Booking created");
      onOpenChange(false); onDone();
    } catch { toast.error("Couldn’t create booking"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add a booking</DialogTitle><DialogDescription>Create a short-term booking manually.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Property" htmlFor="ab-prop" error={errors.propertyId?.message}>
            <select id="ab-prop" className={selectClass} {...register("propertyId")}>
              <option value="">Select a short-term property…</option>
              {(shortProps.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Unit (optional)" htmlFor="ab-unit">
            <select id="ab-unit" className={selectClass} {...register("unitId")}>
              <option value="">Any unit</option>
              {(detail.data?.units ?? []).map((u) => <option key={u.id} value={u.id}>{u.label} · {u.type}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest name" htmlFor="ab-name" error={errors.guestName?.message}><Input id="ab-name" {...register("guestName")} /></Field>
            <Field label="Email" htmlFor="ab-email" error={errors.guestEmail?.message}><Input id="ab-email" type="email" {...register("guestEmail")} /></Field>
            <Field label="Phone" htmlFor="ab-phone" error={errors.guestPhone?.message}><Input id="ab-phone" {...register("guestPhone")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Check-in" htmlFor="ab-in" error={errors.checkIn?.message}><Input id="ab-in" type="date" {...register("checkIn")} /></Field>
            <Field label="Check-out" htmlFor="ab-out" error={errors.checkOut?.message}><Input id="ab-out" type="date" {...register("checkOut")} /></Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>Create booking</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- page */

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked-in" },
  { value: "checked_out", label: "Checked-out" },
  { value: "cancelled", label: "Cancelled" },
  { value: "new", label: "Inquiry: New" },
  { value: "contacted", label: "Inquiry: Contacted" },
  { value: "quoted", label: "Inquiry: Quoted" },
  { value: "converted", label: "Inquiry: Converted" },
  { value: "lost", label: "Inquiry: Lost" },
];

export default function BookingsPage() {
  const [type, setType] = React.useState<"all" | "short-term" | "long-term">("all");
  const [status, setStatus] = React.useState("all");
  const [propertyId, setPropertyId] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [q, setQ] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const props = useAsync(() => listProperties(), []);
  const filters = React.useMemo(
    () => ({ type, status, propertyId, from: from || undefined, to: to || undefined, q: q || undefined, forceError: debugErrorFlag() }),
    [type, status, propertyId, from, to, q],
  );
  const { data, loading, error, reload } = useAsync(() => listBookingRows(filters), [filters]);

  const columns: Column<AdminBookingRow>[] = [
    { key: "reference", header: "Reference", sortable: true, render: (r) => <span className="font-medium text-foreground">{r.reference}</span> },
    { key: "guestName", header: "Guest / Client", sortable: true, render: (r) => <div><p className="font-medium text-foreground">{r.guestName}</p><p className="text-caption text-muted">{r.propertyName}</p></div> },
    { key: "kind", header: "Type", render: (r) => <Badge variant="muted">{r.kind === "short-term" ? "Short-Term" : "Long-Term Inquiry"}</Badge> },
    { key: "unitLabel", header: "Unit", render: (r) => r.unitLabel ?? "—" },
    { key: "date", header: "Dates", sortable: true, render: (r) => r.kind === "short-term" && r.checkIn ? <span className="text-body">{formatDate(r.checkIn)} → {formatDate(r.checkOut!)}</span> : formatDate(r.date) },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: "amount", header: "Amount", align: "right", render: (r) => r.amount != null ? formatUGX(r.amount) : "—" },
  ];

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Short-term stay bookings and long-term rental inquiries, in one place"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton data={data ?? []} filename="bookings" columns={[
              { header: "Reference", accessor: (b) => b.reference },
              { header: "Kind", accessor: (b) => b.kind },
              { header: "Guest", accessor: (b) => b.guestName },
              { header: "Property", accessor: (b) => b.propertyName },
              { header: "Unit", accessor: (b) => b.unitLabel ?? "" },
              { header: "Date", accessor: (b) => b.date.slice(0, 10) },
              { header: "Status", accessor: (b) => b.status },
              { header: "Amount", accessor: (b) => b.amount ?? "" },
            ]} />
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus size={18} /> Add booking</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search bookings" className="h-10 pl-10" />
        </div>
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type">
          <option value="all">All types</option>
          <option value="short-term">Short-term</option>
          <option value="long-term">Long-term inquiry</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={selectClass} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Property">
          <option value="all">All properties</option>
          {(props.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-10" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-10" />
      </div>

      <DataTable
        columns={columns} data={data ?? []} getRowId={(r) => r.id}
        loading={loading} error={error} onRetry={reload}
        onRowClick={(r) => setDetailId(r.id)}
        emptyTitle="No bookings found" emptyDescription="Bookings and inquiries from the marketing site will appear here." pageSize={12}
      />

      <BookingDetailDialog id={detailId} onOpenChange={(o) => !o && setDetailId(null)} onDone={reload} />
      <AddBookingDialog open={addOpen} onOpenChange={setAddOpen} onDone={reload} />
    </div>
  );
}
