import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AnnouncementsHero } from "@/components/sections/announcements/hero";
import { AnnouncementsFeed } from "@/components/sections/announcements/announcements-feed";
import { ClosingCta } from "@/components/sections/announcements/closing-cta";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/data/announcements";

export const metadata: Metadata = {
  title: "Announcements | Azenion — The Limitless Network",
  description:
    "Stay connected with Azenion — discover the latest platform updates, milestones, new features, and community announcements.",
};

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManage = false;
  if (user) {
    const { data: authorized } = await supabase.rpc("can_manage_announcements");
    canManage = !!authorized;
  }

  const { data: rows } = await supabase
    .from("platform_announcements")
    .select("id, emoji, title, category, description, badge, details")
    .order("published_at", { ascending: false });

  const announcements: Announcement[] = (rows ?? []).map((row) => ({
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    category: row.category,
    description: row.description,
    badge: row.badge ?? undefined,
    details: row.details ?? undefined,
  }));

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
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
