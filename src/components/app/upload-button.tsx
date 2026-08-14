"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { recordMutation } from "@/lib/api/actions";

/**
 * Real file-input trigger. Opens the OS picker; on selection it records the
 * upload (audit + toast). No backend in the mock build, but the interaction is
 * genuine — the chosen file's name is surfaced and recorded to the audit trail.
 */
export function UploadButton({
  label = "Upload", accept, entityType = "document", entityName = "Document",
  variant = "outline", size, className, icon, onUploaded,
}: {
  label?: string;
  accept?: string;
  entityType?: string;
  entityName?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  icon?: React.ReactNode;
  onUploaded?: (file: File) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    recordMutation({
      entityType, entityId: `up_${Date.now()}`, entityName: file.name, action: "created",
      summary: `Uploaded ${entityName.toLowerCase()} — ${file.name}`,
      notify: { type: "system", title: `${entityName} uploaded`, body: `${file.name} was uploaded.` },
    });
    toast.success(`${entityName} uploaded`, { description: file.name });
    onUploaded?.(file);
    e.target.value = "";
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onChange} />
      <Button type="button" variant={variant} size={size} className={className} onClick={() => ref.current?.click()}>
        {icon}{label}
      </Button>
    </>
  );
}
