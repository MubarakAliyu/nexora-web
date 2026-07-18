"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Cog, Users, Bell, AdjustmentsHorizontal, ClipboardList, LockOpen, Grid, Upload } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, selectClass } from "@/components/forms/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { saveSettingsSection } from "@/lib/api/admin";
import { RolesTab } from "@/components/admin/settings/roles-tab";
import { AuditTab } from "@/components/admin/settings/audit-tab";
import { SecurityTab } from "@/components/admin/settings/security-tab";
import { IntegrationsTab } from "@/components/admin/settings/integrations-tab";

/* ------------------------------------------------------- company */

const companySchema = z.object({
  name: z.string().min(2, "Enter a company name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone"),
  address: z.string().min(4, "Enter an address"),
  regNumber: z.string().min(2, "Enter a registration number"),
  taxId: z.string().min(2, "Enter a tax ID"),
  description: z.string().optional(),
});
type CompanyValues = z.infer<typeof companySchema>;

function CompanyTab() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "Nexora Property Management", email: "hello@nexora.co.ug", phone: "+256 700 000 000", address: "Plot 12, Nakasero Road, Kampala", regNumber: "80020-1234567", taxId: "1000-2345-67", description: "Premium rental, property, condominium and facility management in Kampala, Uganda." },
  });
  const onSubmit = async () => { await saveSettingsSection("company", "Updated company profile"); toast.success("Company profile saved"); };
  return (
    <Card className="max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div><p className="text-body font-medium text-foreground">Appearance</p><p className="text-caption text-muted">Toggle light or dark mode.</p></div>
        <ThemeToggle variant="icon" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-active text-muted"><Upload size={22} /></div>
          <Button type="button" variant="outline" size="sm" onClick={() => toast.info("Upload logo", { description: "Logo upload is mocked in this build." })}>Upload logo</Button>
        </div>
        <Field label="Company name" htmlFor="co-name" error={errors.name?.message}><Input id="co-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="co-email" error={errors.email?.message}><Input id="co-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
          <Field label="Phone" htmlFor="co-phone" error={errors.phone?.message}><Input id="co-phone" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
          <Field label="Registration number" htmlFor="co-reg" error={errors.regNumber?.message}><Input id="co-reg" {...register("regNumber")} aria-invalid={!!errors.regNumber} /></Field>
          <Field label="Tax ID (TIN)" htmlFor="co-tax" error={errors.taxId?.message}><Input id="co-tax" {...register("taxId")} aria-invalid={!!errors.taxId} /></Field>
        </div>
        <Field label="Address" htmlFor="co-addr" error={errors.address?.message}><Input id="co-addr" {...register("address")} aria-invalid={!!errors.address} /></Field>
        <Field label="Description" htmlFor="co-desc"><textarea id="co-desc" rows={3} className={`${selectClass} h-auto py-2`} {...register("description")} /></Field>
        <Button type="submit" loading={isSubmitting}>Save changes</Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------- global */

function GlobalTab() {
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState({ currency: "UGX", timezone: "Africa/Kampala", dateFormat: "DD MMM YYYY", grace: "5", dueDay: "1", urgentSla: "4", highSla: "24" });
  const set = (k: string, v: string) => setState((s) => ({ ...s, [k]: v }));
  const save = async () => { setBusy(true); await saveSettingsSection("global", "Updated global settings"); toast.success("Global settings saved"); setBusy(false); };
  return (
    <Card className="max-w-2xl p-6">
      <div className="space-y-5">
        <div>
          <h3 className="mb-3 font-heading text-h3 font-semibold text-foreground">Regional</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency" htmlFor="g-cur"><select id="g-cur" className={selectClass} value={state.currency} onChange={(e) => set("currency", e.target.value)}><option value="UGX">UGX</option><option value="USD">USD</option><option value="KES">KES</option></select></Field>
            <Field label="Timezone" htmlFor="g-tz"><select id="g-tz" className={selectClass} value={state.timezone} onChange={(e) => set("timezone", e.target.value)}><option>Africa/Kampala</option><option>Africa/Nairobi</option><option>UTC</option></select></Field>
            <Field label="Date format" htmlFor="g-df"><select id="g-df" className={selectClass} value={state.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}><option>DD MMM YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Field>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-heading text-h3 font-semibold text-foreground">Lease defaults</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default grace period (days)" htmlFor="g-grace"><Input id="g-grace" type="number" value={state.grace} onChange={(e) => set("grace", e.target.value)} /></Field>
            <Field label="Default payment due day (1–28)" htmlFor="g-due"><Input id="g-due" type="number" min={1} max={28} value={state.dueDay} onChange={(e) => set("dueDay", e.target.value)} /></Field>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-heading text-h3 font-semibold text-foreground">Maintenance SLA defaults</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Urgent response (hours)" htmlFor="g-urg"><Input id="g-urg" type="number" value={state.urgentSla} onChange={(e) => set("urgentSla", e.target.value)} /></Field>
            <Field label="High response (hours)" htmlFor="g-high"><Input id="g-high" type="number" value={state.highSla} onChange={(e) => set("highSla", e.target.value)} /></Field>
          </div>
        </div>
        <Button onClick={save} loading={busy}>Save changes</Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------- notifications */

const NOTIF_TYPES = [
  { id: "rent_due", label: "Rent due" },
  { id: "payment", label: "Payment received" },
  { id: "invoice", label: "Invoice generated" },
  { id: "lease_exp", label: "Lease expiring" },
  { id: "maintenance", label: "Maintenance update" },
  { id: "new_lead", label: "New lead" },
  { id: "announcement", label: "Announcement" },
  { id: "system", label: "System alert" },
];
type Channels = { in_app: boolean; email: boolean; sms: boolean };

function NotificationsTab() {
  const [grid, setGrid] = React.useState<Record<string, Channels>>(() =>
    Object.fromEntries(NOTIF_TYPES.map((t) => [t.id, { in_app: true, email: t.id !== "system", sms: t.id === "rent_due" || t.id === "payment" }])),
  );
  const toggle = (id: string, ch: keyof Channels) => setGrid((g) => ({ ...g, [id]: { ...g[id], [ch]: !g[id][ch] } }));
  const save = async () => { await saveSettingsSection("notifications", "Updated notification settings"); toast.success("Notification settings updated"); };
  return (
    <Card className="max-w-2xl p-0">
      <div className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-6 border-b border-border px-6 py-3 text-caption font-semibold uppercase tracking-wide text-muted">
        <span>Notification</span><span>In-app</span><span>Email</span><span>SMS</span>
      </div>
      <div className="divide-y divide-border">
        {NOTIF_TYPES.map((t) => (
          <div key={t.id} className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-6 px-6 py-3.5">
            <span className="text-body text-foreground">{t.label}</span>
            <Switch checked={grid[t.id].in_app} onCheckedChange={() => toggle(t.id, "in_app")} aria-label={`${t.label} in-app`} />
            <Switch checked={grid[t.id].email} onCheckedChange={() => toggle(t.id, "email")} aria-label={`${t.label} email`} />
            <Switch checked={grid[t.id].sms} onCheckedChange={() => toggle(t.id, "sms")} aria-label={`${t.label} SMS`} />
          </div>
        ))}
      </div>
      <div className="px-6 py-4"><Button onClick={save}>Save preferences</Button></div>
    </Card>
  );
}

/* ------------------------------------------------------------ page */

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Company, roles, security, integrations and the audit trail" />
      <Tabs defaultValue="company">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="company"><Cog size={16} className="mr-1.5" /> Company</TabsTrigger>
            <TabsTrigger value="global"><AdjustmentsHorizontal size={16} className="mr-1.5" /> Global</TabsTrigger>
            <TabsTrigger value="roles"><Users size={16} className="mr-1.5" /> Roles</TabsTrigger>
            <TabsTrigger value="notifications"><Bell size={16} className="mr-1.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList size={16} className="mr-1.5" /> Audit Trail</TabsTrigger>
            <TabsTrigger value="security"><LockOpen size={16} className="mr-1.5" /> Security</TabsTrigger>
            <TabsTrigger value="integrations"><Grid size={16} className="mr-1.5" /> Integrations</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="company"><CompanyTab /></TabsContent>
        <TabsContent value="global"><GlobalTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
