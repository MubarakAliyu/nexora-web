"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bullhorn, Envelope, TrashBin } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { RowActions } from "@/components/app/row-actions";
import { DeleteConfirmation } from "@/components/app/delete-confirmation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import { DataTable, type Column } from "@/components/ui/data-table";
import { toast } from "@/components/ui/sonner";
import { useAsync, debugErrorFlag } from "@/lib/use-async";
import { formatDate } from "@/lib/format";
import {
  listAnnouncements, createAnnouncement, deleteAnnouncement, propertyOptions,
  type Announcement, type AudienceKind, type BroadcastChannel, type Scope,
} from "@/lib/api/admin";

const CHANNELS: { id: BroadcastChannel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "in_app", label: "In-app" },
];

const schema = z.object({
  title: z.string().min(3, "Enter a subject"),
  body: z.string().min(5, "Write your message"),
  audience: z.enum(["all_tenants", "property", "owners", "custom"]),
  propertyId: z.string().optional(),
  channels: z.array(z.string()).min(1, "Pick at least one channel"),
});
type Values = z.infer<typeof schema>;

export default function AnnouncementsPage() {
  const [deleting, setDeleting] = React.useState<Announcement | null>(null);
  const scope: Scope = React.useMemo(() => ({ forceError: debugErrorFlag() }), []);
  const props = React.useMemo(() => propertyOptions(), []);
  const { data, loading, error, reload } = useAsync(() => listAnnouncements(scope), [scope]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { audience: "all_tenants", channels: ["email", "in_app"], propertyId: "" },
  });
  const audience = watch("audience");
  const channels = watch("channels");

  const toggleChannel = (id: BroadcastChannel) => {
    const set = new Set(channels);
    if (set.has(id)) set.delete(id); else set.add(id);
    setValue("channels", [...set], { shouldValidate: true });
  };

  const onSubmit = async (v: Values) => {
    const label =
      v.audience === "all_tenants" ? "All tenants" :
      v.audience === "owners" ? "All owners" :
      v.audience === "property" ? (props.find((p) => p.id === v.propertyId)?.name ?? "Property") : "Custom list";
    await createAnnouncement({ title: v.title, body: v.body, audience: v.audience as AudienceKind, audienceLabel: label, channels: v.channels as BroadcastChannel[] });
    toast.success("Announcement sent", { description: `Broadcast to ${label}.` });
    reset({ audience: "all_tenants", channels: ["email", "in_app"], propertyId: "", title: "", body: "" });
    reload();
  };

  const columns: Column<Announcement>[] = [
    { key: "title", header: "Subject", sortable: true, render: (a) => <span className="font-medium text-foreground">{a.title}</span> },
    { key: "audienceLabel", header: "Audience", render: (a) => <Badge variant="muted">{a.audienceLabel}</Badge> },
    { key: "channels", header: "Channels", render: (a) => <span className="capitalize text-muted">{a.channels.map((c) => c.replace("_", "-")).join(", ")}</span> },
    { key: "recipients", header: "Recipients", align: "right", render: (a) => a.recipients },
    { key: "sentAt", header: "Sent", sortable: true, align: "right", render: (a) => formatDate(a.sentAt) },
    {
      key: "actions", header: "", align: "right",
      render: (a) => <RowActions actions={[{ label: "Delete", icon: <TrashBin size={16} />, onClick: () => setDeleting(a), danger: true }]} />,
    },
  ];

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast messages to tenants and owners" />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-h3 font-semibold text-foreground"><Bullhorn size={20} className="text-primary" /> New broadcast</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="Recipients" htmlFor="an-audience">
              <select id="an-audience" className={selectClass} {...register("audience")}>
                <option value="all_tenants">All tenants</option>
                <option value="property">Tenants of a property</option>
                <option value="owners">All owners</option>
                <option value="custom">Custom list</option>
              </select>
            </Field>
            {audience === "property" && (
              <Field label="Property" htmlFor="an-prop">
                <select id="an-prop" className={selectClass} {...register("propertyId")}>
                  <option value="">Select…</option>
                  {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Subject" htmlFor="an-title" error={errors.title?.message}>
              <Input id="an-title" {...register("title")} aria-invalid={!!errors.title} />
            </Field>
            <Field label="Message" htmlFor="an-body" error={errors.body?.message}>
              <textarea id="an-body" rows={4} className={`${selectClass} h-auto py-2`} {...register("body")} aria-invalid={!!errors.body} />
            </Field>
            <div>
              <span className="mb-1.5 block text-caption font-medium text-foreground">Channels</span>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => {
                  const active = channels.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleChannel(c.id)}
                      className={`rounded-full border px-3 py-1 text-caption font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"}`}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {errors.channels && <p className="mt-1 text-caption text-primary">{errors.channels.message}</p>}
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full gap-2"><Envelope size={18} /> Send broadcast</Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">Sent history</h2>
          <DataTable columns={columns} data={data ?? []} getRowId={(a) => a.id} loading={loading} error={error} onRetry={reload}
            emptyTitle="No announcements yet" emptyDescription="Broadcasts you send will appear here." pageSize={8} />
        </div>
      </div>

      <DeleteConfirmation open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} entityLabel="announcement" entityName={deleting?.title ?? ""}
        onConfirm={async () => { if (!deleting) return; try { await deleteAnnouncement(deleting.id); toast.success("Announcement deleted"); reload(); } catch { toast.error("Couldn’t delete announcement"); } }} />
    </div>
  );
}
