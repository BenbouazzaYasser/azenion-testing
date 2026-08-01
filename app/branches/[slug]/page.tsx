import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { BranchPageHero } from "@/components/sections/branches/branch-page-hero";
import { BranchPageStats } from "@/components/sections/branches/branch-page-stats";
import { BranchPageEvents } from "@/components/sections/branches/branch-page-events";
import { BranchPageTeams } from "@/components/sections/branches/branch-page-teams";
import { BranchPageProjects } from "@/components/sections/branches/branch-page-projects";
import { BranchFeed } from "@/components/sections/branches/branch-feed";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBranchFeedItems } from "@/actions/feed.actions";
import type { TeamCardTeam } from "@/components/sections/teams/team-card";
import type { ProjectCardProject } from "@/components/sections/projects/project-card";

interface BranchPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BranchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: branch } = await adminClient
    .from("branches")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!branch) return {};

  return {
    title: `${branch.name} | Azenion — The Limitless Network`,
    description: branch.description ?? `Explore the ${branch.name} branch hub on Azenion.`,
  };
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

export default async function BranchPage({ params }: BranchPageProps) {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const supabase = createClient();

  const { data: branch } = await adminClient
    .from("branches")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!branch) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  let isPlatformAdmin = false;
  let isBranchLeader = false;
  let isMember = false;

  if (user) {
    const [{ data: adminResult }, { data: leaderResult }, { data: membership }] = await Promise.all([
      supabase.rpc("is_platform_admin"),
      supabase.rpc("is_branch_leader", { p_branch_id: branch.id }),
      supabase
        .from("branch_members")
        .select("user_id")
        .eq("branch_id", branch.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    isPlatformAdmin = !!adminResult;
    isBranchLeader = !!leaderResult;
    isMember = !!membership;
  }

  // Platform admins and branch leaders manage the hub.
  const canManage = isPlatformAdmin || isBranchLeader;

  const { data: members } = await adminClient
    .from("branch_members")
    .select(`
      user_id,
      role,
      joined_at,
      user:user_id ( id, username, full_name, avatar_url )
    `)
    .eq("branch_id", branch.id)
    .order("joined_at", { ascending: true });

  const { data: leaderRows } = await adminClient
    .from("branch_leaders")
    .select(`
      assigned_by,
      created_at,
      user:user_id ( id, username, full_name, avatar_url )
    `)
    .eq("branch_id", branch.id);

  const { data: rawEvents } = await adminClient
    .from("branch_events")
    .select("*")
    .eq("branch_id", branch.id)
    .order("starts_at", { ascending: true });

  // ── Teams whose branch is this branch ─────────────────────────────────
  const { data: branchTeams } = await adminClient
    .from("teams")
    .select(`
      id,
      slug,
      name,
      description,
      logo_url,
      visibility,
      created_at,
      updated_at,
      technologies,
      owner:owner_id ( username, full_name, avatar_url )
    `)
    .eq("branch_id", branch.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const branchTeamIds = (branchTeams ?? []).map((t) => t.id);

  const [
    { data: teamMemberRows },
    { data: teamProjectCountRows },
    { data: teamUpdateCountRows },
    { data: teamOpenRoleRows },
    { data: teamCategoryEdges },
    { data: allTeamCategories },
  ] = await Promise.all([
    branchTeamIds.length > 0
      ? adminClient.from("team_members").select("team_id").in("team_id", branchTeamIds)
      : Promise.resolve({ data: [] as { team_id: string }[] }),
    branchTeamIds.length > 0
      ? adminClient.from("projects").select("team_id").in("team_id", branchTeamIds)
      : Promise.resolve({ data: [] as { team_id: string }[] }),
    branchTeamIds.length > 0
      ? adminClient.from("team_updates").select("team_id").in("team_id", branchTeamIds)
      : Promise.resolve({ data: [] as { team_id: string }[] }),
    branchTeamIds.length > 0
      ? adminClient.from("team_open_roles").select("team_id, title").in("team_id", branchTeamIds)
      : Promise.resolve({ data: [] as { team_id: string; title: string }[] }),
    branchTeamIds.length > 0
      ? adminClient.from("team_category_members").select("team_id, category_id").in("team_id", branchTeamIds)
      : Promise.resolve({ data: [] as { team_id: string; category_id: string }[] }),
    adminClient.from("team_categories").select("id, name, slug").order("name").limit(100),
  ]);

  const teamMemberCountMap = new Map<string, number>();
  for (const row of teamMemberRows ?? []) {
    teamMemberCountMap.set(row.team_id, (teamMemberCountMap.get(row.team_id) ?? 0) + 1);
  }

  const teamProjectCountMap = new Map<string, number>();
  for (const row of teamProjectCountRows ?? []) {
    teamProjectCountMap.set(row.team_id, (teamProjectCountMap.get(row.team_id) ?? 0) + 1);
  }

  const teamUpdateCountMap = new Map<string, number>();
  for (const row of teamUpdateCountRows ?? []) {
    teamUpdateCountMap.set(row.team_id, (teamUpdateCountMap.get(row.team_id) ?? 0) + 1);
  }

  const teamOpenRolesMap = new Map<string, { title: string }[]>();
  for (const row of teamOpenRoleRows ?? []) {
    const roles = teamOpenRolesMap.get(row.team_id) ?? [];
    roles.push({ title: row.title });
    teamOpenRolesMap.set(row.team_id, roles);
  }

  const teamCategoryLookup = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of allTeamCategories ?? []) teamCategoryLookup.set(cat.id, cat);

  const teamCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const edge of teamCategoryEdges ?? []) {
    const entries = teamCategoryMap.get(edge.team_id) ?? [];
    const cat = teamCategoryLookup.get(edge.category_id);
    if (cat) entries.push(cat);
    teamCategoryMap.set(edge.team_id, entries);
  }

  const relatedTeamsData: TeamCardTeam[] = (branchTeams ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    logo_url: t.logo_url,
    visibility: t.visibility,
    created_at: t.created_at,
    updated_at: t.updated_at as string | null,
    technologies: Array.isArray(t.technologies) ? t.technologies : [],
    categories: teamCategoryMap.get(t.id) ?? [],
    owner: t.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    member_count: teamMemberCountMap.get(t.id) ?? 0,
    project_count: teamProjectCountMap.get(t.id) ?? 0,
    update_count: teamUpdateCountMap.get(t.id) ?? 0,
    open_roles: teamOpenRolesMap.get(t.id) ?? [],
  }));

  // ── Projects belonging to this branch's teams ─────────────────────────
  const { data: branchProjects } = await adminClient
    .from("projects")
    .select(`
      id,
      slug,
      name,
      description,
      logo_url,
      visibility,
      created_at,
      updated_at,
      technologies,
      recruitment,
      team:team_id ( name, slug ),
      owner:owner_id ( username, full_name, avatar_url )
    `)
    .in("team_id", branchTeamIds.length > 0 ? branchTeamIds : [""])
    .order("created_at", { ascending: false })
    .limit(30);

  const branchProjectIds = (branchProjects ?? []).map((p) => p.id);

  const [{ data: projectMemberRows }, { data: projectCategoryEdges }, { data: allProjectCategories }] =
    await Promise.all([
      branchProjectIds.length > 0
        ? adminClient.from("project_members").select("project_id").in("project_id", branchProjectIds)
        : Promise.resolve({ data: [] as { project_id: string }[] }),
      branchProjectIds.length > 0
        ? adminClient.from("project_category_members").select("project_id, category_id").in("project_id", branchProjectIds)
        : Promise.resolve({ data: [] as { project_id: string; category_id: string }[] }),
      adminClient.from("project_categories").select("id, name, slug").order("name"),
    ]);

  const projectMemberCountMap = new Map<string, number>();
  for (const row of projectMemberRows ?? []) {
    projectMemberCountMap.set(row.project_id, (projectMemberCountMap.get(row.project_id) ?? 0) + 1);
  }

  const projectCategoryLookup = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of allProjectCategories ?? []) projectCategoryLookup.set(cat.id, cat);

  const projectCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const edge of projectCategoryEdges ?? []) {
    const entries = projectCategoryMap.get(edge.project_id) ?? [];
    const cat = projectCategoryLookup.get(edge.category_id);
    if (cat) entries.push(cat);
    projectCategoryMap.set(edge.project_id, entries);
  }

  const relatedProjectsData: ProjectCardProject[] = (branchProjects ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    logo_url: p.logo_url,
    visibility: p.visibility,
    created_at: p.created_at,
    updated_at: p.updated_at as string | null,
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    recruitment: parseRecruitment(p.recruitment) as ProjectCardProject["recruitment"],
    categories: projectCategoryMap.get(p.id) ?? [],
    owner: p.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    team: p.team as unknown as { name: string; slug: string } | null,
    member_count: projectMemberCountMap.get(p.id) ?? 0,
  }));

  // ── Branch-scoped feed ────────────────────────────────────────────────
  const feedResult = await getBranchFeedItems(branch.id, 1, 20, currentUserId);

  const membersWithProfiles = (members ?? []).map((m) => ({
    id: m.user_id,
    username: (m.user as unknown as { username: string } | null)?.username ?? "unknown",
    full_name: (m.user as unknown as { full_name: string } | null)?.full_name ?? null,
    avatar_url: (m.user as unknown as { avatar_url: string | null } | null)?.avatar_url ?? null,
    role: m.role,
  }));

  const managerProfiles = (leaderRows ?? []).map((m) => ({
    ...(m.user as unknown as {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    }),
    role: "leader",
  }));

  const events = (rawEvents ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    starts_at: e.starts_at as string | null,
    ends_at: e.ends_at,
    cover_url: e.cover_url,
    registration_url: e.registration_url,
    visibility: e.visibility,
    schedule: e.schedule as string | null,
  }));

  const branchWithCounts = {
    id: branch.id,
    slug: branch.slug,
    name: branch.name,
    full_name: branch.full_name,
    description: branch.description,
    city: branch.city,
    logo_url: branch.logo_url,
    cover_url: branch.cover_url,
    created_at: branch.created_at,
    memberCount: membersWithProfiles.length,
  };

  const postsCount = feedResult.total;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <BranchPageHero
          branch={branchWithCounts}
          isMember={isMember}
          isBranchLeader={isBranchLeader}
          isPlatformAdmin={isPlatformAdmin}
          currentUserId={currentUserId}
          leaderProfiles={managerProfiles}
        />
        <BranchPageStats
          memberCount={membersWithProfiles.length}
          teamsCount={relatedTeamsData.length}
          projectsCount={relatedProjectsData.length}
          postsCount={postsCount}
          eventsCount={events.filter((e) => e.starts_at && new Date(e.starts_at).getTime() >= Date.now()).length}
          createdAt={branch.created_at}
        />
        <BranchPageTeams teams={relatedTeamsData} />
        <BranchPageProjects projects={relatedProjectsData} />
        <BranchPageEvents
          events={events}
          branchId={branch.id}
          branchSlug={branch.slug}
          branchName={branch.name}
          branchLogoUrl={branch.logo_url}
          canManage={canManage}
        />
        <BranchFeed
          branchId={branch.id}
          branchSlug={branch.slug}
          initialItems={feedResult.items}
          currentUserId={currentUserId}
          canManage={canManage}
        />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
