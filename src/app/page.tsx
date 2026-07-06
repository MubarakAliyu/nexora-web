import { Heading, Text } from "@/components/ui/typography";

/** Temporary landing — the full Ilios-modelled homepage is built in Batch 4. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <Text variant="caption">Nexora Property Management</Text>
      <Heading as="h1" size="hero">Managing Properties. Maximizing Value.</Heading>
      <Text variant="muted" className="max-w-xl">
        Design-system foundation is in place. The marketing site and dashboards are
        built out across Batches 3–11.
      </Text>
    </main>
  );
}
