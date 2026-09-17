interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders schema.org structured data for crawlers. Server-only output:
 * a plain script tag with no client JS attached.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io";
}
