import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchManageClient } from "@/components/sections/branches/branch-manage-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");

  if (!isAdmin) notFound();

  const admin = createAdminClient();

  const { data: branches } = await admin
    .from("branches")
    .select("*")
    .order("name", { ascending: true });

  const { data: memberRows } = await admin
    .from("branch_members")
    .select("branch_id");

  const memberCountMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountMap.set(row.branch_id, (memberCountMap.get(row.branch_id) ?? 0) + 1);
  }

  const { data: leaderRows } = await admin
    .from("branch_leaders")
    .select(`
      branch_id,
      user:user_id ( id, username, full_name, avatar_url )
    `);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .order("username", { ascending: true });

  const branchesWithMembers: BranchWithMembers[] = (branches ?? []).map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    full_name: b.full_name,
    description: b.description,
    city: b.city,
    logo_url: b.logo_url,
    member_count: memberCountMap.get(b.id) ?? 0,
    leaders: (leaderRows ?? [])
      .filter((r) => r.branch_id === b.id)
      .map((r) => r.user as unknown as {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
      }),
  }));

  const profileOptions: ProfileOption[] = (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
  }));

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <BranchManageClient branches={branchesWithMembers} profiles={profileOptions} />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
