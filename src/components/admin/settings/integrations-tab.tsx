"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { CreditCard, Envelope, MessageDots, Image as ImageIcon, Server } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { recordMutation } from "@/lib/api/actions";
import { useIntegrations } from "@/lib/stores/integrations";

type FieldType = "text" | "secret" | "select";
interface IntegrationField { name: string; label: string; type: FieldType; options?: string[]; required?: boolean; display?: boolean }
interface Integration {
  id: string; name: string; kind: string; description: string;
  icon: React.ComponentType<{ size?: number }>;
  fields: IntegrationField[];
}

const INTEGRATIONS: Integration[] = [
  { id: "flutterwave", name: "Flutterwave", kind: "Payments", description: "Collect rent via mobile money and cards.", icon: CreditCard,
    fields: [
      { name: "apiKey", label: "API Key", type: "secret", required: true },
      { name: "secretKey", label: "Secret Key", type: "secret", required: true },
      { name: "webhookUrl", label: "Webhook URL", type: "text" },
      { name: "mode", label: "Mode", type: "select", options: ["Test", "Live"], display: true },
    ] },
  { id: "stripe", name: "Stripe", kind: "Payments", description: "International card payments and payouts.", icon: CreditCard,
    fields: [
      { name: "apiKey", label: "API Key", type: "secret", required: true },
      { name: "secretKey", label: "Secret Key", type: "secret", required: true },
      { name: "webhookUrl", label: "Webhook URL", type: "text" },
      { name: "mode", label: "Mode", type: "select", options: ["Test", "Live"], display: true },
    ] },
  { id: "resend", name: "Resend", kind: "Email", description: "Transactional email delivery.", icon: Envelope,
    fields: [
      { name: "apiKey", label: "API Key", type: "secret", required: true },
      { name: "fromEmail", label: "From Email", type: "text", required: true, display: true },
    ] },
  { id: "africastalking", name: "Africa’s Talking", kind: "SMS", description: "Bulk SMS for reminders and announcements.", icon: MessageDots,
    fields: [
      { name: "username", label: "Username", type: "text", required: true, display: true },
      { name: "apiKey", label: "API Key", type: "secret", required: true },
      { name: "senderId", label: "Sender ID", type: "text", display: true },
    ] },
  { id: "cloudinary", name: "Cloudinary", kind: "Images", description: "Property image hosting and transforms.", icon: ImageIcon,
    fields: [
      { name: "cloudName", label: "Cloud Name", type: "text", required: true, display: true },
      { name: "apiKey", label: "API Key", type: "secret", required: true },
      { name: "apiSecret", label: "API Secret", type: "secret", required: true },
    ] },
  { id: "s3", name: "AWS S3", kind: "Documents", description: "Secure document storage.", icon: Server,
    fields: [
      { name: "bucketName", label: "Bucket Name", type: "text", required: true, display: true },
      { name: "accessKey", label: "Access Key", type: "secret", required: true },
      { name: "secretKey", label: "Secret Key", type: "secret", required: true },
      { name: "region", label: "Region", type: "text", required: true, display: true },
    ] },
];

function ConfigureDialog({ integration, onOpenChange }: { integration: Integration | null; onOpenChange: (o: boolean) => void }) {
  const save = useIntegrations((s) => s.save);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Record<string, string>>({ defaultValues: {} });
  React.useEffect(() => { if (integration) reset({}); }, [integration, reset]);

  const onSubmit = async (values: Record<string, string>) => {
    if (!integration) return;
    await new Promise((r) => setTimeout(r, 400));
    const display: Record<string, string> = {};
    integration.fields.filter((f) => f.display).forEach((f) => { if (values[f.name]) display[f.label] = values[f.name]; });
    save(integration.id, display);
    recordMutation({
      entityType: "integration", entityId: integration.id, entityName: integration.name, action: "updated",
      summary: `${integration.name} integration configured`,
      notify: { type: "system", title: "Integration saved", body: `${integration.name} configuration saved.` },
    });
    toast.success(`${integration.name} configuration saved`);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!integration} onOpenChange={onOpenChange}>
      <DialogContent>
        {integration && (
          <>
            <DialogHeader>
              <DialogTitle>Configure {integration.name}</DialogTitle>
              <DialogDescription>Enter your {integration.kind.toLowerCase()} credentials. Secrets are stored securely.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {integration.fields.map((f) => (
                <Field key={f.name} label={f.label} htmlFor={`in-${f.name}`} error={errors[f.name]?.message as string | undefined}>
                  {f.type === "select" ? (
                    <select id={`in-${f.name}`} className={selectClass} {...register(f.name, f.required ? { required: `Select ${f.label.toLowerCase()}` } : {})}>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input id={`in-${f.name}`} type={f.type === "secret" ? "password" : "text"} autoComplete="off"
                      {...register(f.name, f.required ? { required: `Enter ${f.label.toLowerCase()}` } : {})} aria-invalid={!!errors[f.name]} />
                  )}
                </Field>
              ))}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" loading={isSubmitting}>Save configuration</Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsTab() {
  const [configuring, setConfiguring] = React.useState<Integration | null>(null);
  const configs = useIntegrations((s) => s.configs);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon;
          const connected = configs[i.id]?.connected ?? false;
          return (
            <Card key={i.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-active text-primary"><Icon size={22} /></span>
                {connected ? <Badge variant="secondary">Connected</Badge> : <Badge variant="muted">Not configured</Badge>}
              </div>
              <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">{i.name}</h3>
              <p className="mt-1 flex-1 text-body text-muted">{i.description}</p>
              <Button variant={connected ? "outline" : "primary"} size="sm" className="mt-4 self-start" onClick={() => setConfiguring(i)}>
                {connected ? "Manage" : "Configure"}
              </Button>
            </Card>
          );
        })}
      </div>
      <ConfigureDialog integration={configuring} onOpenChange={(o) => { if (!o) setConfiguring(null); }} />
    </div>
  );
}
