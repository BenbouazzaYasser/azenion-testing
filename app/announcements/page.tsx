import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { AnnouncementsHero } from "@/components/sections/announcements/hero";
import { AnnouncementsFeed } from "@/components/sections/announcements/announcements-feed";
import { ComingSoon } from "@/components/sections/announcements/coming-soon";
import { ClosingCta } from "@/components/sections/announcements/closing-cta";

export const metadata: Metadata = {
  title: "Announcements | Azenion — The Limitless Network",
  description:
    "Stay connected with Azenion — discover the latest platform updates, milestones, new features, and community announcements.",
};

export default function AnnouncementsPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <AnnouncementsHero />
        <AnnouncementsFeed />
        <ComingSoon />
        <ClosingCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
