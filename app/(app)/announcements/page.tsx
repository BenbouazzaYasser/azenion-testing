import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { AnnouncementsHero } from "@/components/sections/announcements/hero";
import { AnnouncementsFeed } from "@/components/sections/announcements/announcements-feed";
import { ClosingCta } from "@/components/sections/announcements/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
import type { Announcement } from "@/data/announcements";

export const metadata: Metadata = {
  title: "Announcements | Azenion — The Limitless Network",
  description:
    "Stay connected with Azenion — discover the latest platform updates, milestones, new features, and community announcements.",
};

export const dynamic = "force-dynamic";

async function fetchPublishedAnnouncements(): Promise<Announcement[]> {
  // Public, non-user-specific content: safe to share across visitors.
  // Served through the admin client with the same public select the page
  // previously ran under RLS, so anon visitors see identical rows.
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("platform_announcements")
    .select("id, emoji, title, category, description, badge, details")
    .order("published_at", { ascending: false });

  return (rows ?? []).map((row) => ({
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    category: row.category,
    description: row.description,
    badge: row.badge ?? undefined,
    details: row.details ?? undefined,
  }));
}

const getPublishedAnnouncements = unstable_cache(
  fetchPublishedAnnouncements,
  ["announcements-page-data"],
  { revalidate: 60 },
);

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const user = await getSessionUser();

  let canManage = false;
  if (user) {
    const { data: authorized } = await supabase.rpc("can_manage_announcements");
    canManage = !!authorized;
  }

  const announcements = await getPublishedAnnouncements();

  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <AnnouncementsHero />
        <AnnouncementsFeed announcements={announcements} canManage={canManage} />
        <ClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
