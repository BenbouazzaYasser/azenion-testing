import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azenion.io";

  const staticRoutes: { route: string; priority: number }[] = [
    { route: "", priority: 1 },
    { route: "/about", priority: 0.8 },
    { route: "/community", priority: 0.8 },
    { route: "/branches", priority: 0.8 },
    { route: "/teams", priority: 0.8 },
    { route: "/projects", priority: 0.8 },
    { route: "/servers", priority: 0.8 },
    { route: "/showcase", priority: 0.8 },
    { route: "/announcements", priority: 0.8 },
    { route: "/contact", priority: 0.5 },
    { route: "/join", priority: 0.5 },
    { route: "/login", priority: 0.5 },
    { route: "/academy", priority: 0.8 },
    { route: "/academy/courses", priority: 0.8 },
    { route: "/academy/roadmaps", priority: 0.6 },
    { route: "/academy/live-sessions", priority: 0.8 },
    { route: "/academy/labs", priority: 0.8 },
    { route: "/terms", priority: 0.3 },
    { route: "/privacy", priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map(({ route, priority }) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));

  // Detail pages are resolved at request time so the sitemap reflects the
  // current public catalog. Only public content is submitted: public teams,
  // open projects, all branch hubs, and published labs. Auth-gated surfaces
  // (/u/*, /feed/*, /chat/*, settings) are intentionally excluded, matching
  // robots.ts.
  try {
    const admin = createAdminClient();
    const [{ data: teams }, { data: projects }, { data: branches }, { data: labs }] =
      await Promise.all([
        admin.from("teams").select("slug, updated_at").eq("visibility", "public").limit(5000),
        admin.from("projects").select("slug, updated_at").eq("visibility", "open").limit(5000),
        admin.from("branches").select("slug, updated_at").limit(1000),
        admin.from("labs").select("id, updated_at").eq("is_published", true).limit(5000),
      ]);

    for (const team of teams ?? []) {
      if (!team.slug) continue;
      entries.push({
        url: `${siteUrl}/teams/${team.slug}`,
        lastModified: team.updated_at ? new Date(team.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
    for (const project of projects ?? []) {
      if (!project.slug) continue;
      entries.push({
        url: `${siteUrl}/projects/${project.slug}`,
        lastModified: project.updated_at ? new Date(project.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
    for (const branch of branches ?? []) {
      if (!branch.slug) continue;
      entries.push({
        url: `${siteUrl}/branches/${branch.slug}`,
        lastModified: branch.updated_at ? new Date(branch.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
    for (const lab of labs ?? []) {
      entries.push({
        url: `${siteUrl}/academy/labs/${lab.id}`,
        lastModified: lab.updated_at ? new Date(lab.updated_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap generation must never fail the build: fall back to the
    // static entries above if the catalog query fails.
  }

  return entries;
}
