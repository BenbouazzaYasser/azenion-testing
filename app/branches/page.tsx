import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchShowcase } from "@/components/sections/branches/branch-showcase";
import { ComingSoonTeaser } from "@/components/sections/branches/coming-soon";
import { BranchesHero } from "@/components/sections/branches/hero";
import { NetworkStats } from "@/components/sections/branches/network-stats";
import { activeBranches, totalUpcomingEvents } from "@/data/branches";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Branches | Azenion — The Limitless Network",
  description:
    "Explore Azenion's campus branches — EMSI and FSR — and find your local hub within the Limitless Network.",
};

export default async function BranchesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dbBranches } = await supabase.from("branches").select("id, slug, name");

  const { count: memberCount } = await supabase
    .from("branch_members")
    .select("*", { count: "exact", head: true });

  let userBranchSlug: string | null = null;
  if (user) {
    const { data: membership } = await supabase
      .from("branch_members")
      .select("branch_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      const branch = dbBranches?.find((b) => b.id === membership.branch_id);
      userBranchSlug = branch?.slug ?? null;
    }
  }

  const branchCount = dbBranches?.length ?? activeBranches.length;
  const totalMembers = memberCount ?? 0;
  const membershipBySlug: Record<string, boolean> = {};
  for (const b of activeBranches) {
    membershipBySlug[b.slug] = b.slug === userBranchSlug;
  }

  const dbBranchLookup = new Map(
    (dbBranches ?? []).map((b) => [b.slug, b.id])
  );

  const enrichedBranches = activeBranches.map((b) => ({
    ...b,
    dbId: dbBranchLookup.get(b.slug),
    memberCount: totalMembers,
  }));

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <BranchesHero branchCount={branchCount} memberCount={totalMembers} />
        <NetworkStats
          branchCount={branchCount}
          memberCount={totalMembers}
          upcomingEvents={totalUpcomingEvents}
        />
        <BranchShowcase branches={enrichedBranches} membershipBySlug={membershipBySlug} />
        <ComingSoonTeaser />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
