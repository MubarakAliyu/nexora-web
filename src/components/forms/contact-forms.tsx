"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactForm } from "./contact-form";
import { QuoteForm } from "./quote-form";
import { AssessmentForm } from "./assessment-form";

/** Tabbed contact panel — General enquiry / Quote request / Free assessment. */
export function ContactForms() {
  return (
    <Tabs defaultValue="general">
      <TabsList variant="pill" className="flex-wrap">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="quote">Request a quote</TabsTrigger>
        <TabsTrigger value="assessment">Free assessment</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <ContactForm />
      </TabsContent>
      <TabsContent value="quote">
        <QuoteForm />
      </TabsContent>
      <TabsContent value="assessment">
        <AssessmentForm />
      </TabsContent>
    </Tabs>
  );
}
