import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io";

  const staticRoutes = [
    "",
    "/about",
    "/community",
    "/branches",
    "/teams",
    "/projects",
    "/showcase",
    "/announcements",
    "/contact",
    "/join",
    "/login",
    "/academy",
    "/academy/courses",
    "/academy/live-sessions",
    "/academy/labs",
    "/terms",
    "/privacy",
  ];

  const lastModified = new Date();

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}