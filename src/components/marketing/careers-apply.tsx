"use client";

import * as React from "react";
import { CheckCircle } from "flowbite-react-icons/outline";
import { Accordion, AccordionItem } from "./accordion";
import { Button } from "@/components/ui/button";
import { JobApplicationForm } from "@/components/forms/job-application-form";
import { positions } from "@/content/careers";

/** Open-positions accordion + application form. Clicking "Apply" prefills the
 *  position and scrolls to the form (which stacks below on mobile). */
export function CareersApply() {
  const [position, setPosition] = React.useState("");

  const apply = (title: string) => {
    setPosition(title);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
      <div>
        <h2 className="font-heading text-h1 font-semibold text-foreground">Open positions</h2>
        <Accordion className="mt-8">
          {positions.map((p) => (
            <AccordionItem key={p.title} title={p.title} subtitle={`${p.location} · ${p.type}`}>
              <p className="text-body text-muted">{p.description}</p>
              <ul className="mt-4 space-y-2">
                {p.requirements.map((r) => (
                  <li key={r} className="flex gap-2.5 text-body text-foreground">
                    <CheckCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-5" size="sm" onClick={() => apply(p.title)}>
                Apply for this role
              </Button>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div id="apply" className="scroll-mt-24">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-xl md:p-8">
          <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary">
            Apply
          </p>
          <h3 className="mt-2 font-heading text-h3 font-semibold text-foreground">
            Send your application
          </h3>
          <p className="mt-1 text-body text-muted">
            Fill in your details and attach your CV.
          </p>
          <div className="mt-6">
            <JobApplicationForm defaultPosition={position} />
          </div>
        </div>
      </div>
    </div>
  );
}
