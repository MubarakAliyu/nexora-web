"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/** App-wide toast host, themed to the palette. Mount once near the app root. */
export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-background !border !border-border !text-foreground !rounded-md !shadow-lg !font-sans",
          title: "!text-foreground !font-medium",
          description: "!text-muted",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-surface-active !text-foreground !rounded-md",
          closeButton: "!bg-background !border-border !text-muted",
        },
      }}
      {...props}
    />
  );
}

export { toast };
