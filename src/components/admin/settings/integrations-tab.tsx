"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Envelope, MessageDots, Image as ImageIcon, Server } from "flowbite-react-icons/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

interface Integration { id: string; name: string; kind: string; connected: boolean; description: string; icon: React.ComponentType<{ size?: number }> }
const INTEGRATIONS: Integration[] = [
  { id: "flutterwave", name: "Flutterwave", kind: "Payments", connected: true, description: "Collect rent via mobile money and cards.", icon: CreditCard },
  { id: "stripe", name: "Stripe", kind: "Payments", connected: false, description: "International card payments and payouts.", icon: CreditCard },
  { id: "resend", name: "Resend", kind: "Email", connected: true, description: "Transactional email delivery.", icon: Envelope },
  { id: "africastalking", name: "Africa’s Talking", kind: "SMS", connected: true, description: "Bulk SMS for reminders and announcements.", icon: MessageDots },
  { id: "cloudinary", name: "Cloudinary", kind: "Images", connected: false, description: "Property image hosting and transforms.", icon: ImageIcon },
  { id: "s3", name: "AWS S3", kind: "Documents", connected: false, description: "Secure document storage.", icon: Server },
];

const schema = z.object({
  apiKey: z.string().min(4, "Enter the API key"),
  apiSecret: z.string().min(4, "Enter the secret"),
});
type Values = z.infer<typeof schema>;

function ConfigureDialog({ integration, onOpenChange }: { integration: Integration | null; onOpenChange: (o: boolean) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { apiKey: "", apiSecret: "" } });
  React.useEffect(() => { if (integration) reset({ apiKey: "", apiSecret: "" }); }, [integration, reset]);
  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Integration saved", { description: `${integration?.name} credentials stored (mocked).` });
    onOpenChange(false);
  };
  return (
    <Dialog open={!!integration} onOpenChange={onOpenChange}>
      <DialogContent>
        {integration && (
          <>
            <DialogHeader><DialogTitle>Configure {integration.name}</DialogTitle><DialogDescription>Enter your {integration.kind.toLowerCase()} API credentials. Stored securely (mocked in this build).</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Field label="API key" htmlFor="in-key" error={errors.apiKey?.message}><Input id="in-key" type="password" autoComplete="off" {...register("apiKey")} aria-invalid={!!errors.apiKey} /></Field>
              <Field label="API secret" htmlFor="in-secret" error={errors.apiSecret?.message}><Input id="in-secret" type="password" autoComplete="off" {...register("apiSecret")} aria-invalid={!!errors.apiSecret} /></Field>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" loading={isSubmitting}>Save credentials</Button>
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
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon;
          return (
            <Card key={i.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-active text-primary"><Icon size={22} /></span>
                {i.connected ? <Badge variant="secondary">Connected</Badge> : <Badge variant="muted">Not configured</Badge>}
              </div>
              <h3 className="mt-4 font-heading text-h3 font-semibold text-foreground">{i.name}</h3>
              <p className="mt-1 flex-1 text-body text-muted">{i.description}</p>
              <Button variant={i.connected ? "outline" : "primary"} size="sm" className="mt-4 self-start" onClick={() => setConfiguring(i)}>
                {i.connected ? "Manage" : "Configure"}
              </Button>
            </Card>
          );
        })}
      </div>
      <ConfigureDialog integration={configuring} onOpenChange={(o) => { if (!o) setConfiguring(null); }} />
    </div>
  );
}
