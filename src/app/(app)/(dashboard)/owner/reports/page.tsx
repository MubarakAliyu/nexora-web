"use client";

import * as React from "react";
import { FileLines, Download, CalendarMonth } from "flowbite-react-icons/outline";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/stores/session";
import { downloadPdf } from "@/lib/pdf/download";
import { statementPdf } from "@/lib/pdf/builders";

type ReportKind = "Monthly" | "Quarterly" | "Annual";
interface OwnerReport {
  id: string;
  title: string;
  kind: ReportKind;
  period: string;
  date: string;
  size: string;
}

const REPORTS: OwnerReport[] = [
  { id: "r1", title: "Owner statement — June 2026", kind: "Monthly", period: "Jun 2026", date: "1 Jul 2026", size: "248 KB" },
  { id: "r2", title: "Owner statement — May 2026", kind: "Monthly", period: "May 2026", date: "1 Jun 2026", size: "241 KB" },
  { id: "r3", title: "Owner statement — April 2026", kind: "Monthly", period: "Apr 2026", date: "1 May 2026", size: "239 KB" },
  { id: "r4", title: "Q2 2026 portfolio summary", kind: "Quarterly", period: "Q2 2026", date: "1 Jul 2026", size: "512 KB" },
  { id: "r5", title: "Q1 2026 portfolio summary", kind: "Quarterly", period: "Q1 2026", date: "1 Apr 2026", size: "498 KB" },
  { id: "r6", title: "2025 annual owner report", kind: "Annual", period: "FY 2025", date: "15 Jan 2026", size: "1.2 MB" },
];

function kindTone(kind: ReportKind) {
  return kind === "Annual" ? "secondary" : "muted";
}

export default function OwnerReportsPage() {
  const ownerId = useSession((s) => s.user?.ownerId) ?? "";
  const download = (r: OwnerReport) => { const { payload, filename } = statementPdf(ownerId, r.period); downloadPdf(payload, filename); };

  const groups: { label: string; kind: ReportKind }[] = [
    { label: "Monthly statements", kind: "Monthly" },
    { label: "Quarterly summaries", kind: "Quarterly" },
    { label: "Annual reports", kind: "Annual" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Download your statements and portfolio summaries" />

      {groups.map((g) => {
        const items = REPORTS.filter((r) => r.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <section key={g.kind}>
            <h2 className="mb-4 font-heading text-h3 font-semibold text-foreground">{g.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <Card key={r.id} className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-active text-primary"><FileLines size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-caption text-muted">
                      <CalendarMonth size={13} /> {r.date} · {r.size}
                      <Badge variant={kindTone(r.kind)} className="ml-1">{r.kind}</Badge>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(r)}
                    aria-label={`Download ${r.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Download size={18} />
                  </button>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
