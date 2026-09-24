import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchManageClient } from "@/components/sections/branches/branch-manage-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

export const metadata: Metadata = {
  title: "Manage Branches | Azenion",
  description: "Manage Azenion campus branches.",
};

interface BranchWithMembers {
  id: string;
  slug: string;
  name: string;
  full_name: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
  sort_order: number | null;
  member_count: number;
  leaders: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

interface ProfileOption {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default async function ManageBranchesPage() {
  const supabase = await createClient();

  const user = await getSessionUser();

  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  if (!isAdmin) notFound();

  const admin = createAdminClient();

  const { data: branches } = await admin
    .from("branches")
    .select("id, slug, name, full_name, description, city, logo_url, sort_order")
    .order("name", { ascending: true });

  const branchIds = (branches ?? []).map((b) => b.id);
  const scopedBranchIds = branchIds.length > 0 ? branchIds : [""];

  // Leaders and counts are scoped to the branches on this page; the
  // leader-assignment typeahead now searches server-side
  // (searchBranchLeaderCandidates), so member rows never reach the client.
  const [{ data: leaderRows }, memberCountsRes] = await Promise.all([
    admin
      .from("branch_leaders")
      .select(`
        branch_id,
        user_id,
        user:user_id ( id, username, full_name, avatar_url )
      `)
      .in("branch_id", scopedBranchIds),
    admin.rpc("get_branch_member_counts"),
  ]);

  const memberCountMap = new Map<string, number>();
  if (!memberCountsRes.error) {
    for (const r of (memberCountsRes.data ?? []) as { branch_id: string; member_count: number | string }[]) {
      memberCountMap.set(r.branch_id, Number(r.member_count ?? 0));
    }
  } else {
    // Fallback (pre-00150): grouped client-side from the counts RPC's absence.
    const { data: allMemberRows } = await admin.from("branch_members").select("branch_id");
    for (const row of (allMemberRows ?? []) as { branch_id: string }[]) {
      memberCountMap.set(row.branch_id, (memberCountMap.get(row.branch_id) ?? 0) + 1);
    }
  }

  const branchesWithMembers: BranchWithMembers[] = (branches ?? []).map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    full_name: b.full_name,
    description: b.description,
    city: b.city,
    logo_url: b.logo_url,
    sort_order: b.sort_order,
    member_count: memberCountMap.get(b.id) ?? 0,
    leaders: (leaderRows ?? [])
      .filter((r) => r.branch_id === b.id && r.user)
      .map((r) => r.user as unknown as {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
      }),
  }));

  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <BranchManageClient branches={branchesWithMembers} />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
