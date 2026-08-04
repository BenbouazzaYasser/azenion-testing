import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { TeamHero } from "@/components/sections/teams/team-hero";
import { TeamStats } from "@/components/sections/teams/team-stats";
import { TeamMembers } from "@/components/sections/teams/team-members";
import { TeamOpenRoles } from "@/components/sections/teams/team-open-roles";
import { TeamProjects } from "@/components/sections/teams/team-projects";
import { TeamJoinCta } from "@/components/sections/teams/team-join-cta";
import { TeamFeed } from "@/components/sections/teams/team-feed";
import { TeamJoinRequests } from "@/components/sections/teams/team-join-requests";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamPermissions, TEAM_PERMISSIONS, TeamPermission } from "@/lib/team-permissions.server";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: team } = await adminClient
    .from("teams")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!team) return {};

  return {
    title: `${team.name} | Azenion — The Limitless Network`,
    description: team.description ?? `Learn more about ${team.name} on Azenion.`,
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const supabase = createClient();

  const { data: team } = await adminClient
    .from("teams")
    .select(`
      *,
      owner:owner_id ( id, username, full_name, avatar_url )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!team) notFound();

  const { data: teamBranch } = team.branch_id
    ? await adminClient
        .from("branches")
        .select("id, name, slug")
        .eq("id", team.branch_id)
        .maybeSingle()
    : { data: null };

  const branchData = teamBranch
    ? { id: teamBranch.id, name: teamBranch.name, slug: teamBranch.slug }
    : null;

  const { data: { user } } = await supabase.auth.getUser();

  if (team.visibility === "private") {
    if (!user) notFound();
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) notFound();
  }

  let requestStatus: "PENDING" | "ACCEPTED" | "DECLINED" | null = null;
  if (user) {
    const { data: status } = await supabase.rpc("get_my_team_request_status", {
      p_team_id: team.id,
    });
    requestStatus = (status as "PENDING" | "ACCEPTED" | "DECLINED" | null) ?? null;
  }

  const { data: members } = await adminClient
    .from("team_members")
    .select(`
      role,
      joined_at,
      user:user_id ( id, username, full_name, avatar_url )
    `)
    .eq("team_id", team.id)
    .order("joined_at", { ascending: true });

  const { data: openRoles } = await adminClient
    .from("team_open_roles")
    .select("*")
    .eq("team_id", team.id)
    .order("created_at", { ascending: true });

  const { data: rawTeamUpdates } = await adminClient
    .from("team_updates")
    .select("*, author:author_id ( id, username, full_name, avatar_url )")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false });

  const teamUpdateIds = (rawTeamUpdates ?? []).map((u) => u.id);
  const teamUpdateLikeCounts: Record<string, number> = {};
  const teamUpdateCommentCounts: Record<string, number> = {};
  const teamUpdateUserLikes = new Set<string>();

  const { data: teamPins } = await adminClient
    .from("feed_pins")
    .select("post_id")
    .eq("scope", "team")
    .eq("team_id", team.id);

  const pinnedUpdateIds = new Set<string>();
  const pinnedPostIds = (teamPins ?? []).map((p) => p.post_id);
  if (pinnedPostIds.length > 0) {
    const { data: pinnedPosts } = await adminClient
      .from("posts")
      .select("source_id")
      .eq("source_type", "team_update")
      .in("id", pinnedPostIds);
    for (const p of pinnedPosts ?? []) {
      if (p.source_id) pinnedUpdateIds.add(p.source_id);
    }
  }

  if (teamUpdateIds.length > 0) {
    const [{ data: tuLikes }, { data: tuComments }] = await Promise.all([
      adminClient.from("update_likes").select("target_id").eq("target_type", "team_update").in("target_id", teamUpdateIds),
      adminClient.from("update_comments").select("target_id").eq("target_type", "team_update").in("target_id", teamUpdateIds),
    ]);
    for (const id of teamUpdateIds) { teamUpdateLikeCounts[id as string] = 0; teamUpdateCommentCounts[id as string] = 0; }
    for (const l of tuLikes ?? []) { teamUpdateLikeCounts[l.target_id] = (teamUpdateLikeCounts[l.target_id] ?? 0) + 1; }
    for (const c of tuComments ?? []) { teamUpdateCommentCounts[c.target_id] = (teamUpdateCommentCounts[c.target_id] ?? 0) + 1; }

    if (user) {
      const { data: userTULikes } = await supabase
        .from("update_likes")
        .select("target_id")
        .eq("user_id", user.id)
        .eq("target_type", "team_update")
        .in("target_id", teamUpdateIds);
      for (const l of userTULikes ?? []) teamUpdateUserLikes.add(l.target_id);
    }
  }

  const { data: categories } = await adminClient
    .from("team_categories")
    .select("*")
    .order("name", { ascending: true });

  // Fetch team categories via pivot table (separate query avoids PostgREST FK cache issues)
  const { data: teamCategoryEdges } = await adminClient
    .from("team_category_members")
    .select("category_id")
    .eq("team_id", team.id);

  const selectedCategoryIds = new Set((teamCategoryEdges ?? []).map((e) => e.category_id));
  const teamCategories = (categories ?? [])
    .filter((c) => selectedCategoryIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  const { data: teamProjects } = await adminClient
    .from("projects")
    .select(`
      id,
      slug,
      name,
      description,
      logo_url,
      visibility,
      lifecycle_status,
      last_activity_at,
      created_at,
      updated_at,
      technologies,
      recruitment,
      owner:owner_id ( username, full_name, avatar_url )
    `)
    .eq("team_id", team.id)
    .order("created_at", { ascending: false });

  const { data: projectCategories } = await adminClient
    .from("project_categories")
    .select("id, name, slug")
    .order("name");

  const allCategoriesMap = new Map<string, { id: string; name: string; slug: string }>();
  if (projectCategories) {
    for (const cat of projectCategories) {
      allCategoriesMap.set(cat.id, cat);
    }
  }

  let projectMemberCounts: Record<string, number> = {};
  let projectCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
  if (teamProjects && teamProjects.length > 0) {
    const projectIds = teamProjects.map((p) => p.id);
    const { data: projectMembers } = await adminClient
      .from("project_members")
      .select("project_id")
      .in("project_id", projectIds);
    if (projectMembers) {
      for (const pm of projectMembers) {
        projectMemberCounts[pm.project_id] = (projectMemberCounts[pm.project_id] ?? 0) + 1;
      }
    }
    const { data: catEdges } = await adminClient
      .from("project_category_members")
      .select("project_id, category_id")
      .in("project_id", projectIds);
    for (const edge of catEdges ?? []) {
      const entries = projectCategoryMap.get(edge.project_id) ?? [];
      const cat = allCategoriesMap.get(edge.category_id);
      if (cat) entries.push(cat);
      projectCategoryMap.set(edge.project_id, entries);
    }
  }

  function parseRecruitment(raw: unknown) {
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  const projectsData: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    visibility: string;
    lifecycle_status: string | null;
    last_activity_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    technologies: string[];
    categories: { id: string; name: string; slug: string }[];
    recruitment: { id: string; title: string; experience: "beginner" | "intermediate" | "advanced"; positions: number; description: string }[];
    owner: { username: string; full_name: string; avatar_url: string | null } | null;
    member_count: number;
    team: { name: string; slug: string };
  }[] = (teamProjects ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    logo_url: p.logo_url,
    visibility: p.visibility,
    lifecycle_status: p.lifecycle_status,
    last_activity_at: p.last_activity_at as string | null,
    created_at: p.created_at,
    updated_at: p.updated_at as string | null,
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    categories: projectCategoryMap.get(p.id) ?? [],
    recruitment: parseRecruitment(p.recruitment) as {
      id: string;
      title: string;
      experience: "beginner" | "intermediate" | "advanced";
      positions: number;
      description: string;
    }[],
    owner: p.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    member_count: projectMemberCounts[p.id] ?? 0,
    team: { name: team.name, slug: team.slug },
  }));

  let currentMember: { role: string } | null = null;

  if (user && members) {
    currentMember = members.find(
      (m) => m.user && typeof m.user === "object" && "id" in m.user && (m.user as { id: string }).id === user.id
    ) ?? null;
  }

  const isMember = !!currentMember;
  const isOwner = user?.id === team.owner_id;

  let permissions: Record<TeamPermission, boolean> | null = null;
  if (user) {
    permissions = await getTeamPermissions(team.id, TEAM_PERMISSIONS);
  }

  const canReview = permissions?.[TeamPermission.REVIEW_JOIN_REQUESTS] ?? false;
  const canInvite = permissions?.[TeamPermission.INVITE_MEMBERS] ?? false;
  const canRemoveMembers = permissions?.[TeamPermission.REMOVE_MEMBERS] ?? false;
  const canPost = permissions?.[TeamPermission.CREATE_FEED_POSTS] ?? false;
  const canPin = permissions?.[TeamPermission.EDIT_FEED_POSTS] ?? false;
  const canCreateProjects = permissions?.[TeamPermission.CREATE_PROJECTS] ?? false;

  const { data: rawJoinRequests } = canReview
    ? await supabase.rpc("get_team_join_requests", { p_team_id: team.id })
    : { data: null };

  const joinRequests = ((rawJoinRequests ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    team_id: r.team_id as string,
    user_id: r.user_id as string,
    username: r.username as string,
    full_name: r.full_name as string,
    avatar_url: r.avatar_url as string | null,
    institution: r.institution as string | null,
    message: r.message as string | null,
    status: r.status as string,
    created_at: r.created_at as string,
  }));

  const ownerProfile = team.owner as unknown as {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };

  const membersWithProfiles = (members ?? []).map((m) => ({
    role: m.role,
    joined_at: m.joined_at,
    profile: m.user as unknown as {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    },
  }));

  const openRolesData = (openRoles ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    quantity: r.quantity,
  }));

  const categoriesData = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  const sortedTeamUpdates = [...(rawTeamUpdates ?? [])].sort((a, b) => {
    const aPinned = pinnedUpdateIds.has(a.id) ? 1 : 0;
    const bPinned = pinnedUpdateIds.has(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime();
  });

  const teamUpdates = sortedTeamUpdates.map((u: Record<string, unknown>) => ({
    id: u.id as string,
    title: u.title as string,
    body: u.body as string | null,
    image_url: u.image_url as string | null,
    images: Array.isArray(u.images) ? (u.images as string[]).filter(Boolean) : [],
    created_at: u.created_at as string,
    updated_at: u.updated_at as string,
    author: u.author as {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    },
    like_count: teamUpdateLikeCounts[u.id as string] ?? 0,
    comment_count: teamUpdateCommentCounts[u.id as string] ?? 0,
    user_has_liked: teamUpdateUserLikes.has(u.id as string),
    is_pinned: pinnedUpdateIds.has(u.id as string),
  }));

  const teamWithOwner = {
    id: team.id,
    slug: team.slug,
    name: team.name,
    description: team.description,
    logo_url: team.logo_url,
    banner_url: team.banner_url,
    visibility: team.visibility,
    status: team.status,
    last_activity_at: team.last_activity_at,
    created_at: team.created_at,
    categories: teamCategories,
    owner: ownerProfile,
    memberCount: membersWithProfiles.length,
    branch: branchData,
  };

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <TeamHero
          team={teamWithOwner}
          isMember={isMember}
          currentUserId={user?.id ?? null}
          requestStatus={requestStatus}
          categories={categoriesData}
        />
        <TeamStats
          memberCount={membersWithProfiles.length}
          projectsCount={projectsData.length}
          openRolesCount={openRolesData.length}
          createdAt={team.created_at}
          categories={teamCategories}
        />
        <TeamJoinRequests requests={joinRequests} />
        <TeamMembers
          members={membersWithProfiles}
          teamId={team.id}
          teamName={team.name}
          teamSlug={team.slug}
          currentUserId={user?.id ?? null}
          canInvite={canInvite}
          canRemoveMembers={canRemoveMembers}
        />
        <TeamOpenRoles
          roles={openRolesData}
          teamId={team.id}
          teamSlug={team.slug}
          canManage={isOwner}
        />
        <TeamProjects
          projects={projectsData}
          canCreateProjects={canCreateProjects}
          teamId={team.id}
          teamSlug={team.slug}
        />
        <TeamFeed
          teamId={team.id}
          teamSlug={team.slug}
          updates={teamUpdates}
          currentUserId={user?.id ?? null}
          isMember={isMember}
          canPost={canPost}
          canPin={canPin}
        />
        <TeamJoinCta
          teamId={team.id}
          teamName={team.name}
          teamSlug={team.slug}
          isMember={isMember}
          isOwner={isOwner}
          requestStatus={requestStatus}
        />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
