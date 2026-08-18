interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
}

export const dynamic = "force-static";
export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.com";

const publicRoutes = [
  "",
  "branches",
  "teams",
  "projects",
  "academy",
  "profiles",
];

export async function GET() {
  const entries = publicRoutes.map((route) => {
    const url = route === "" ? BASE_URL : `${BASE_URL}/${route}`;
    return {
      url,
      lastmod: new Date().toISOString(),
      changefreq: "weekly" as const,
      priority: 0.8,
    };
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${entries
    .map(
      (entry) => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}