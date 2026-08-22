import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TeamPermission,
  TEAM_PERMISSIONS,
  getTeamPermissions,
} from "@/lib/team-permissions.server";
import { TeamSettingsClient } from "@/components/sections/teams/settings/team-settings-client";
import { resolveMediaValue } from "@/lib/media";

interface TeamSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamSettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: team } = await adminClient
    .from("teams")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  if (!team) return {};

  return {
    title: `${team.name} Settings | Azenion — The Limitless Network`,
  };
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const supabase = createClient();

  const { data: team } = await adminClient
    .from("teams")
    .select("id, name, slug, description, logo_url, banner_url, visibility, created_at, owner_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!team) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/teams/${slug}`);

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect(`/teams/${slug}`);

  const [resolvedLogo, resolvedBanner] = await Promise.all([
    resolveMediaValue(team.logo_url),
    resolveMediaValue(team.banner_url),
  ]);
  const teamData = {
    ...team,
    logo_url: (resolvedLogo as string | null) ?? null,
    banner_url: (resolvedBanner as string | null) ?? null,
  };

  const isOwner = user.id === team.owner_id;
  const isPlatformAdmin = (await supabase.rpc("is_platform_admin"))?.data === true;

  const permissionMap = await getTeamPermissions(team.id, TEAM_PERMISSIONS);
  const has = (p: TeamPermission) => permissionMap[p];

  const canManageRoles = isOwner || isPlatformAdmin;
  const canInvite = has(TeamPermission.INVITE_MEMBERS);
  const canReviewRequests = has(TeamPermission.REVIEW_JOIN_REQUESTS);
  const canRemoveMembers = has(TeamPermission.REMOVE_MEMBERS);
  const canEditInfo = has(TeamPermission.EDIT_TEAM_INFORMATION);
  const canEditAppearance = has(TeamPermission.EDIT_TEAM_APPEARANCE);

  const [{ data: rawRoles }, { data: rawMemberRoles }] = await Promise.all([
    supabase.rpc("get_team_roles", { p_team_id: team.id }),
    supabase.rpc("get_team_member_roles", { p_team_id: team.id }),
  ]);

  const roles = ((rawRoles ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    team_id: r.team_id as string,
    name: r.name as string,
    color: (r.color as string | null) ?? null,
    permissions: (r.permissions as string[]) ?? [],
    member_count: (r.member_count as number) ?? 0,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));

  const memberRolesByUser = new Map<string, string[]>();
  for (const row of (rawMemberRoles ?? []) as Record<string, unknown>[]) {
    memberRolesByUser.set(row.member_id as string, (row.role_ids as string[]) ?? []);
  }

  const { data: members } = await adminClient
    .from("team_members")
    .select("role, joined_at, user:user_id ( id, username, full_name, avatar_url )")
    .eq("team_id", team.id)
    .order("joined_at", { ascending: true });

  const membersData = (members ?? []).map((m) => {
    const profile = m.user as unknown as {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
    return {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: m.role as string,
      joined_at: m.joined_at as string | null,
      role_ids: memberRolesByUser.get(profile.id) ?? [],
    };
  });

  let joinRequests: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    message: string | null;
    status: string;
    created_at: string;
  }[] = [];
  if (canReviewRequests) {
    const { data: rawJoinRequests } = await supabase.rpc("get_team_join_requests", {
      p_team_id: team.id,
    });
    joinRequests = ((rawJoinRequests ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      username: r.username as string,
      full_name: r.full_name as string,
      avatar_url: r.avatar_url as string | null,
      message: r.message as string | null,
      status: r.status as string,
      created_at: r.created_at as string,
    }));
  }

  let invitations: {
    id: string;
    invited_user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    invited_by_username: string | null;
    status: string;
    created_at: string;
  }[] = [];
  if (canInvite) {
    const { data: rawInvitations } = await supabase.rpc("get_team_invitations", {
      p_team_id: team.id,
    });
    invitations = ((rawInvitations ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      invited_user_id: r.invited_user_id as string,
      username: r.username as string,
      full_name: r.full_name as string,
      avatar_url: r.avatar_url as string | null,
      invited_by_username: r.invited_by_username as string | null,
      status: r.status as string,
      created_at: r.created_at as string,
    }));
  }

  const { data: categories } = await adminClient
    .from("team_categories")
    .select("*")
    .order("name", { ascending: true });

  const { data: teamCategoryEdges } = await adminClient
    .from("team_category_members")
    .select("category_id")
    .eq("team_id", team.id);

  const categoriesData = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));
  const teamCategoryIds = (teamCategoryEdges ?? []).map((e) => e.category_id);

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <TeamSettingsClient
          team={teamData}
          isOwner={isOwner}
          isPlatformAdmin={isPlatformAdmin}
          canManageRoles={canManageRoles}
          canInvite={canInvite}
          canReviewRequests={canReviewRequests}
          canRemoveMembers={canRemoveMembers}
          canEditInfo={canEditInfo}
          canEditAppearance={canEditAppearance}
          roles={roles}
          members={membersData}
          joinRequests={joinRequests}
          invitations={invitations}
          categories={categoriesData}
          teamCategoryIds={teamCategoryIds}
          currentUserId={user.id}
        />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
