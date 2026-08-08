import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
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
        ],
        disallow: [
          "/settings",
          "/profile",
          "/feed",
          "/chat",
          "/notifications",
          "/onboarding",
          "/teams/create",
          "/projects/create",
          "/branches/manage",
          "/profile/my-projects",
          "/profile/my-teams",
          "/profile/my-branches",
          "/teams/[slug]/settings",
          "/projects/[slug]/settings",
          "/chat/start",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}