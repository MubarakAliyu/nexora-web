import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + accessible error message for a form field. */
export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  /** F5 — ReactNode so a label can carry the live currency code. */
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-caption text-primary">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared native-select styling (matches Input) for RHF-registered selects. */
export const selectClass =
  "h-11 w-full rounded-md border border-border bg-background px-3.5 text-body text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-primary";
