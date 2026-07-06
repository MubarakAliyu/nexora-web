import { Heading, Text } from "@/components/ui/typography";

/**
 * TEMPORARY About placeholder — no hero, so the header should render SOLID from
 * the top (dark primary logo, --foreground nav). Confirms the has-hero mechanism.
 * The real About page is built in Batch 5.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-16">
      <Text variant="caption">About</Text>
      <Heading as="h1" size="h1">
        About Nexora
      </Heading>
      <Text variant="muted" className="max-w-2xl">
        This placeholder page has no full-bleed hero, so the marketing header is solid
        from the very top — dark primary logo, --foreground navigation. The full About
        page (story, values, leadership, roadmap) is built in Batch 5.
      </Text>
      <div className="h-64 rounded-lg border border-border bg-surface-hover" />
      <div className="h-64 rounded-lg border border-border bg-surface-hover" />
    </div>
  );
}
