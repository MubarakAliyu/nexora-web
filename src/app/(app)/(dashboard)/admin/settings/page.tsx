"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Cog, Users, Bell, AdjustmentsHorizontal } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/forms/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { toast } from "@/components/ui/sonner";
import { roleLabels, adminRoles } from "@/lib/roles";

const companySchema = z.object({
  name: z.string().min(2, "Enter a company name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a phone"),
  tin: z.string().min(4, "Enter a TIN"),
  address: z.string().min(4, "Enter an address"),
});
type CompanyValues = z.infer<typeof companySchema>;

function CompanyTab() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "Nexora Property Management", email: "hello@nexora.co.ug", phone: "+256 700 000 000", tin: "1000-2345-67", address: "Plot 12, Nakasero Road, Kampala" },
  });
  const onSubmit = async (_v: CompanyValues) => { await new Promise((r) => setTimeout(r, 600)); toast.success("Company profile saved"); };
  return (
    <Card className="max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-body font-medium text-foreground">Appearance</p>
          <p className="text-caption text-muted">Toggle light or dark mode for the dashboard.</p>
        </div>
        <ThemeToggle variant="icon" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Company name" htmlFor="co-name" error={errors.name?.message}><Input id="co-name" {...register("name")} aria-invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="co-email" error={errors.email?.message}><Input id="co-email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
          <Field label="Phone" htmlFor="co-phone" error={errors.phone?.message}><Input id="co-phone" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
          <Field label="TIN" htmlFor="co-tin" error={errors.tin?.message}><Input id="co-tin" {...register("tin")} aria-invalid={!!errors.tin} /></Field>
          <Field label="Address" htmlFor="co-addr" error={errors.address?.message}><Input id="co-addr" {...register("address")} aria-invalid={!!errors.address} /></Field>
        </div>
        <Button type="submit" loading={isSubmitting}>Save changes</Button>
      </form>
    </Card>
  );
}

function RolesTab() {
  const descriptions: Record<string, string> = {
    super_admin: "Full access to every module and setting.",
    ops_manager: "Operations oversight across properties and teams.",
    property_manager: "Manages properties, units, tenants, leases and maintenance.",
    maintenance_officer: "Handles maintenance tickets and technicians.",
    finance_officer: "Invoices, payments, expenses and financial reports.",
  };
  const counts: Record<string, number> = { super_admin: 1, ops_manager: 1, property_manager: 2, maintenance_officer: 1, finance_officer: 1 };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {adminRoles.map((r) => (
        <Card key={r} className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-h3 font-semibold text-foreground">{roleLabels[r]}</h3>
            <Badge variant="muted">{counts[r] ?? 0} member{(counts[r] ?? 0) === 1 ? "" : "s"}</Badge>
          </div>
          <p className="mt-2 text-body text-muted">{descriptions[r]}</p>
        </Card>
      ))}
    </div>
  );
}

function NotificationsTab() {
  const events = [
    { id: "rent_due", label: "Rent due & overdue reminders" },
    { id: "new_lead", label: "New lead captured" },
    { id: "ticket", label: "Maintenance ticket updates" },
    { id: "lease_expiry", label: "Lease expiry alerts" },
    { id: "payment", label: "Payment received" },
  ];
  return (
    <Card className="max-w-2xl divide-y divide-border p-0">
      <div className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-4 px-6 py-3 text-caption font-medium uppercase tracking-wide text-muted">
        <span>Event</span><span>Email</span><span>SMS</span><span>In-app</span>
      </div>
      {events.map((e) => (
        <div key={e.id} className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-4 px-6 py-3.5">
          <span className="text-body text-foreground">{e.label}</span>
          <Checkbox defaultChecked aria-label={`${e.label} email`} />
          <Checkbox defaultChecked={e.id !== "payment"} aria-label={`${e.label} SMS`} />
          <Checkbox defaultChecked aria-label={`${e.label} in-app`} />
        </div>
      ))}
      <div className="px-6 py-4">
        <Button onClick={() => toast.success("Notification settings saved")}>Save preferences</Button>
      </div>
    </Card>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "MTN / Airtel Mobile Money", desc: "Collect rent via mobile money.", connected: true },
    { name: "Flutterwave", desc: "Card payments and payouts.", connected: false },
    { name: "SMS Gateway", desc: "Bulk SMS for announcements.", connected: true },
    { name: "QuickBooks", desc: "Sync invoices and expenses.", connected: false },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {integrations.map((i) => (
        <Card key={i.name} className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-h3 font-semibold text-foreground">{i.name}</h3>
              {i.connected && <Badge variant="secondary">Connected</Badge>}
            </div>
            <p className="mt-1 text-body text-muted">{i.desc}</p>
          </div>
          <Button variant={i.connected ? "outline" : "primary"} size="sm"
            onClick={() => toast.info(i.connected ? "Manage integration" : "Connect integration", { description: "Integrations are mocked in this build." })}>
            {i.connected ? "Manage" : "Connect"}
          </Button>
        </Card>
      ))}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Company profile, roles, notifications and integrations" />
      <Tabs defaultValue="company">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="company"><Cog size={16} className="mr-1.5" /> Company</TabsTrigger>
            <TabsTrigger value="roles"><Users size={16} className="mr-1.5" /> Roles</TabsTrigger>
            <TabsTrigger value="notifications"><Bell size={16} className="mr-1.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="integrations"><AdjustmentsHorizontal size={16} className="mr-1.5" /> Integrations</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="company"><CompanyTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
