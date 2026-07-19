"use client";

import { toast } from "@/components/ui/sonner";
import type { PdfPayload } from "./documents";

/** Sanitize a string into a filename-safe slug. */
export function slugFile(s: string) {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Generate a branded PDF client-side and trigger a browser download. @react-pdf
 * and the document components are imported dynamically so they stay out of the
 * page's initial bundle and never evaluate during SSR / build.
 */
export async function downloadPdf(payload: PdfPayload, filename: string): Promise<void> {
  toast.info("Preparing PDF", { description: `Downloading ${filename}…` });
  try {
    const [{ pdf }, { renderDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./documents"),
    ]);
    const blob = await pdf(renderDocument(payload)).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success("Downloaded", { description: a.download });
  } catch {
    toast.error("Couldn’t generate PDF", { description: "Please try again." });
  }
}
