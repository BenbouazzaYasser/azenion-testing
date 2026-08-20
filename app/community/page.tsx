import type { Metadata } from "next";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { CommunityHero } from "@/components/sections/community/hero";
import { LatestFeed } from "@/components/sections/community/latest-feed";
import { ShowcasePreview } from "@/components/sections/community/showcase-preview";
import { AnnouncementsPreview } from "@/components/sections/community/announcements-preview";
import { TrendingTeams } from "@/components/sections/community/trending-teams";
import { FeaturedProjects } from "@/components/sections/community/featured-projects";
import { AcademySessions } from "@/components/sections/community/academy-sessions";
import { CommunityCta } from "@/components/sections/community/final-cta";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveMediaValue } from "@/lib/media";
import { getFeedItems, getTrendingFeedItems } from "@/actions/feed.actions";
import {
  getTrendingTeamIds,
  getFeaturedProjectIds,
} from "@/actions/ranking.actions";
import { isTeamHidden } from "@/lib/lifecycle";
import { getProjectLifecycleStatus } from "@/lib/lifecycle";
import type { TeamCardTeam } from "@/components/sections/teams/team-card";
import type { ProjectCardProject } from "@/components/sections/projects/project-card";
import type { Announcement } from "@/data/announcements";
import type {
  LiveSessionRow,
  LiveSessionWithManage,
} from "@/lib/validations/live-session.schema";

export const metadata: Metadata = {
  title: "Community | Azenion — The Limitless Network",
  description:
    "The Azenion Community — the feed, showcase, announcements, teams, projects and live sessions across the Limitless Network.",
};

export const revalidate = 300;

export default async function CommunityPage() {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [trendingTeamIds, featuredProjectIds] = await Promise.all([
    getTrendingTeamIds(8),
    getFeaturedProjectIds(8),
  ]);

  const [
    { data: teamRows },
    { data: projectRows },
    { data: sessionRows },
    { data: announcementRows },
  ] = await Promise.all([
    trendingTeamIds.length > 0
      ? admin
          .from("teams")
          .select(`
        id,
        slug,
        name,
        description,
        logo_url,
        visibility,
        status,
        last_activity_at,
        created_at,
        updated_at,
        technologies,
        owner:owner_id ( username, full_name, avatar_url )
      `)
          .in("id", trendingTeamIds)
          .limit(5)
      : admin
          .from("teams")
          .select(`
        id,
        slug,
        name,
        description,
        logo_url,
        visibility,
        status,
        last_activity_at,
        created_at,
        updated_at,
        technologies,
        owner:owner_id ( username, full_name, avatar_url )
      `)
          .eq("visibility", "public")
          .order("last_activity_at", { ascending: false })
          .limit(5),
    featuredProjectIds.length > 0
      ? admin
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
            owner:owner_id ( username, full_name, avatar_url ),
            team:team_id ( name, slug )
          `)
          .in("id", featuredProjectIds)
          .limit(5)
      : admin
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
            owner:owner_id ( username, full_name, avatar_url ),
            team:team_id ( name, slug )
          `)
          .order("created_at", { ascending: false })
          .limit(5),
    supabase.rpc("get_live_sessions"),
    admin
      .from("platform_announcements")
      .select("id, emoji, title, category, description, badge, details")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  function orderRowsByIds<T extends { id: string }>(rows: T[] | null, orderedIds: string[]): T[] {
    if (orderedIds.length === 0) return rows ?? [];
    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const ordered: T[] = [];
    for (const id of orderedIds) {
      const row = byId.get(id);
      if (row) ordered.push(row);
    }
    for (const row of rows ?? []) {
      if (!orderedIds.includes(row.id)) ordered.push(row);
    }
    return ordered;
  }

  const orderedTeamRows = orderRowsByIds(teamRows, trendingTeamIds);
  const orderedProjectRows = orderRowsByIds(projectRows, featuredProjectIds);

  const teamIds = orderedTeamRows.map((t) => t.id);
  const projectIds = orderedProjectRows.map((p) => p.id);

  const [
    { data: memberRows },
    { data: projectCountRows },
    { data: projectMemberRows },
  ] = await Promise.all([
    teamIds.length > 0
      ? admin.from("team_members").select("team_id").in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? admin.from("projects").select("team_id").in("team_id", teamIds)
      : { data: [] },
    projectIds.length > 0
      ? admin.from("project_members").select("project_id").in("project_id", projectIds)
      : { data: [] },
  ]);

  const memberCountMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountMap.set(row.team_id, (memberCountMap.get(row.team_id) ?? 0) + 1);
  }

  const projectCountMap = new Map<string, number>();
  for (const row of projectCountRows ?? []) {
    projectCountMap.set(row.team_id, (projectCountMap.get(row.team_id) ?? 0) + 1);
  }

  const projectMemberCountMap = new Map<string, number>();
  for (const row of projectMemberRows ?? []) {
    projectMemberCountMap.set(
      row.project_id,
      (projectMemberCountMap.get(row.project_id) ?? 0) + 1
    );
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

const teams: TeamCardTeam[] = await Promise.all(
    (orderedTeamRows ?? [])
      .filter((team) => !isTeamHidden(team.last_activity_at as string | null))
      .slice(0, 3)
      .map(async (team) => ({
    id: team.id,
    slug: team.slug,
    name: team.name,
    description: team.description,
    logo_url: ((await resolveMediaValue(team.logo_url, undefined, supabase)) as string | null) ?? null,
    visibility: team.visibility,
    status: team.status,
    last_activity_at: team.last_activity_at as string | null,
    created_at: team.created_at,
    updated_at: team.updated_at as string | null,
    technologies: Array.isArray(team.technologies) ? team.technologies : [],
    categories: [],
    owner: team.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    member_count: memberCountMap.get(team.id) ?? 0,
    project_count: projectCountMap.get(team.id) ?? 0,
    update_count: 0,
    open_roles: [],
    }))
  );

  const projects: ProjectCardProject[] = await Promise.all(
    (orderedProjectRows ?? [])
      .filter((p) => getProjectLifecycleStatus(p.last_activity_at as string | null) !== "ARCHIVED")
      .slice(0, 4)
      .map(async (p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    logo_url: ((await resolveMediaValue(p.logo_url, undefined, supabase)) as string | null) ?? null,
    visibility: p.visibility,
    lifecycle_status: p.lifecycle_status,
    last_activity_at: p.last_activity_at as string | null,
    created_at: p.created_at,
    updated_at: p.updated_at as string | null,
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    recruitment: parseRecruitment(p.recruitment) as {
      id: string;
      title: string;
      experience: "beginner" | "intermediate" | "advanced";
      positions: number;
      description: string;
    }[],
    categories: [],
    owner: p.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    team: p.team as unknown as { name: string; slug: string } | null,
    member_count: projectMemberCountMap.get(p.id) ?? 0,
    }))
  );

  const sessions: LiveSessionWithManage[] = ((sessionRows ?? []) as LiveSessionRow[]).map(
    (session) => ({
      ...session,
      canManage: false,
    })
  );

  const announcements: Announcement[] = (announcementRows ?? []).map((row) => ({
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    category: row.category,
    description: row.description,
    badge: row.badge ?? undefined,
    details: row.details ?? undefined,
  }));

  const { items: trendedFeed } = await getTrendingFeedItems(6, null);
  const feedItems =
    trendedFeed.length > 0
      ? trendedFeed
      : (await getFeedItems("all", 1, 3, null)).items;

  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <CommunityHero />
        <LatestFeed items={feedItems} />
        <ShowcasePreview />
        <AnnouncementsPreview announcements={announcements} />
        <TrendingTeams teams={teams} />
        <FeaturedProjects projects={projects} />
        <AcademySessions sessions={sessions} />
        <CommunityCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
