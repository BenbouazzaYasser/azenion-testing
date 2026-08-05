import type { Metadata } from "next";
import { Landmark } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchShowcase } from "@/components/sections/branches/branch-showcase";
import { ComingSoonTeaser } from "@/components/sections/branches/coming-soon";
import { BranchesHero } from "@/components/sections/branches/hero";
import { NetworkStats } from "@/components/sections/branches/network-stats";
import { EmptyState } from "@/components/ui/empty-state";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { mapBranchRow } from "@/data/branches";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Branches | Azenion — The Limitless Network",
  description:
    "Explore Azenion's campus branches and find your local hub within the Limitless Network.",
};

export default async function BranchesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dbBranches } = await supabase
    .from("branches")
    .select("id, slug, name, full_name, description, logo_url, cover_url, city, created_at");

  const { count: memberCount } = await supabase
    .from("branch_members")
    .select("*", { count: "exact", head: true });

  let userBranchSlug: string | null = null;
  let isBranchMember = false;
  if (user) {
    const { data: membership } = await supabase
      .from("branch_members")
      .select("branch_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      isBranchMember = true;
      const branch = dbBranches?.find((b) => b.id === membership.branch_id);
      userBranchSlug = branch?.slug ?? null;
    }
  }

  const branches = dbBranches ?? [];
  const totalMembers = memberCount ?? 0;

  const enrichedBranches = branches.map((b) => ({
    ...mapBranchRow(b),
    dbId: b.id,
    memberCount: totalMembers,
  }));

  const membershipBySlug: Record<string, boolean> = {};
  for (const b of branches) {
    membershipBySlug[b.slug] = b.slug === userBranchSlug;
  }

  const branchCount = branches.length;
  const totalUpcomingEvents = enrichedBranches.reduce(
    (sum, branch) => sum + branch.upcomingEvents.length,
    0,
  );

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        {user && !isBranchMember ? (
          <EmptyState
            icon={<Landmark size={32} />}
            title="You haven't joined any branches yet."
            description="Explore the communities below and join one."
            eyebrow="Your branches"
            scrollToId="branches"
            actionLabel="Explore Branches"
          />
        ) : (
          <BranchesHero branchCount={branchCount} memberCount={totalMembers} />
        )}
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
