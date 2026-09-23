interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders schema.org structured data for crawlers. Server-only output:
 * a plain script tag with no client JS attached.
 */
export function JsonLd({ data }: JsonLdProps) {
  // JSON.stringify does not escape "<": without this, a "</script>" inside user
  // content (post titles/bodies) would terminate the tag and execute — stored
  // XSS on public pages. \u2028/\u2029 are valid JSON but invalid JS literals.
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io";
}
