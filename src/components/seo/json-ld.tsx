/** Inline JSON-LD structured data (server-rendered <script>). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, author-controlled content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
