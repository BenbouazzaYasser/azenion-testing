import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchShowcase } from "@/components/sections/branches/branch-showcase";
import { ComingSoonTeaser } from "@/components/sections/branches/coming-soon";
import { BranchesHero } from "@/components/sections/branches/hero";
import { NetworkStats } from "@/components/sections/branches/network-stats";

export const metadata: Metadata = {
  title: "Branches | Azenion — The Limitless Network",
  description:
    "Explore Azenion's campus branches — EMSI and FSR — and find your local hub within the Limitless Network.",
};

export default function BranchesPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <BranchesHero />
        <NetworkStats />
        <BranchShowcase />
        <ComingSoonTeaser />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
