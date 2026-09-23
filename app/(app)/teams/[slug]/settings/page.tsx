import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/user";
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
  const supabase = await createClient();

  const [{ data: team }, user] = await Promise.all([
    adminClient
      .from("teams")
      .select("id, name, slug, description, logo_url, banner_url, visibility, created_at, owner_id")
      .eq("slug", slug)
      .maybeSingle(),
    getSessionUser(),
  ]);

  if (!team) notFound();

  if (!user) redirect(`/teams/${slug}`);

  const [{ data: membership }, resolvedMedia, { data: isAdminResult }] = await Promise.all([
    supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    Promise.all([
      resolveMediaValue(team.logo_url, undefined, adminClient),
      resolveMediaValue(team.banner_url, undefined, adminClient),
    ]),
    supabase.rpc("is_platform_admin"),
  ]);

  if (!membership) redirect(`/teams/${slug}`);

  const [resolvedLogo, resolvedBanner] = resolvedMedia;
  const teamData = {
    ...team,
    logo_url: (resolvedLogo as string | null) ?? null,
    banner_url: (resolvedBanner as string | null) ?? null,
  };

  const isOwner = user.id === team.owner_id;
  const isPlatformAdmin = isAdminResult === true;

  const [{ data: rawCapabilities }, permissionMap] = await Promise.all([
    isPlatformAdmin || isOwner
      ? supabase.rpc("get_team_capabilities", { p_team_id: team.id })
      : Promise.resolve({ data: null }),
    getTeamPermissions(team.id, TEAM_PERMISSIONS),
  ]);
  const capabilities = ((rawCapabilities ?? []) as unknown as { capability: string }[]).map(
    (c) => c.capability,
  );

  const has = (p: TeamPermission) => permissionMap[p];

  const canManageRoles = isOwner || isPlatformAdmin;
  const canInvite = has(TeamPermission.INVITE_MEMBERS);
  const canReviewRequests = has(TeamPermission.REVIEW_JOIN_REQUESTS);
  const canRemoveMembers = has(TeamPermission.REMOVE_MEMBERS);
  const canEditInfo = has(TeamPermission.EDIT_TEAM_INFORMATION);
  const canEditAppearance = has(TeamPermission.EDIT_TEAM_APPEARANCE);

  const [{ data: rawRoles }, { data: rawMemberRoles }, { data: members }, { data: categories }, { data: teamCategoryEdges }] = await Promise.all([
    supabase.rpc("get_team_roles", { p_team_id: team.id }),
    supabase.rpc("get_team_member_roles", { p_team_id: team.id }),
    adminClient
      .from("team_members")
      .select("role, joined_at, user:user_id ( id, username, full_name, avatar_url )")
      .eq("team_id", team.id)
      .order("joined_at", { ascending: true }),
    adminClient
      .from("team_categories")
      .select("*")
      .order("name", { ascending: true }),
    adminClient
      .from("team_category_members")
      .select("category_id")
      .eq("team_id", team.id),
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

  const [{ data: rawJoinRequests }, { data: rawInvitations }] = await Promise.all([
    canReviewRequests
      ? supabase.rpc("get_team_join_requests", { p_team_id: team.id })
      : Promise.resolve({ data: null }),
    canInvite
      ? supabase.rpc("get_team_invitations", { p_team_id: team.id })
      : Promise.resolve({ data: null }),
  ]);

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

  const categoriesData = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));
  const teamCategoryIds = (teamCategoryEdges ?? []).map((e) => e.category_id);

  return (
    <>
      <main id="main" className="relative overflow-hidden">
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
          capabilities={capabilities}
          currentUserId={user.id}
        />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
