import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TeamsHero } from "@/components/sections/teams/hero";
import { FeaturedTeam } from "@/components/sections/teams/featured-team";
import { CreateTeam } from "@/components/sections/teams/create-team";
import { WhyTeams } from "@/components/sections/teams/why-teams";
import { FutureVision } from "@/components/sections/teams/future-vision";
import { PageBridge } from "@/components/sections/page-bridge";

export const metadata: Metadata = {
  title: "Teams | Azenion — The Limitless Network",
  description:
    "Explore Azenion's teams — collaborative groups building projects, startups, and innovations across the Limitless Network.",
};

export default function TeamsPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <TeamsHero />
        <FeaturedTeam />
        <WhyTeams />
        <CreateTeam />
        <FutureVision />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
