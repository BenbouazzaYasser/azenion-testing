import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Features } from "@/components/sections/features";
import { PageBridge } from "@/components/sections/page-bridge";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { WhyAzenion } from "@/components/sections/home/why-azenion";
import { Ecosystem } from "@/components/sections/home/ecosystem";
import { HowItWorks } from "@/components/sections/home/how-it-works";
import { FeaturedContent } from "@/components/sections/home/featured-content";
import { AcademyPreview } from "@/components/sections/home/academy-preview";
import { FeedPreview } from "@/components/sections/home/feed-preview";
import { CommunityNumbers } from "@/components/sections/home/community-numbers";
import { Roadmap } from "@/components/sections/home/roadmap";
import { Faq } from "@/components/sections/home/faq";
import { FinalCta } from "@/components/sections/home/final-cta";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveMediaValue } from "@/lib/media";
import { getFeedItems } from "@/actions/feed.actions";
import { isTeamHidden } from "@/lib/lifecycle";
import { getProjectLifecycleStatus } from "@/lib/lifecycle";
import type { TeamCardTeam } from "@/components/sections/teams/team-card";
import type { ProjectCardProject } from "@/components/sections/projects/project-card";
import type {
  LiveSessionRow,
  LiveSessionWithManage,
} from "@/lib/validations/live-session.schema";

export const revalidate = 300;

export default async function HomePage() {
  const admin = createAdminClient();
  const supabase = createClient();

  const [
    { data: teamRows },
    { data: projectRows },
    { data: sessionRows },
    { count: countMembers },
    { count: countTeams },
    { count: countProjects },
    { count: countBranches },
  ] = await Promise.all([
    admin
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
      .order("created_at", { ascending: false })
      .limit(3),
    admin
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
      .limit(4),
    admin.rpc("get_live_sessions"),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("teams").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin.from("branches").select("id", { count: "exact", head: true }),
  ]);

  const teamIds = (teamRows ?? []).map((t) => t.id);
  const projectIds = (projectRows ?? []).map((p) => p.id);

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
    (teamRows ?? [])
      .filter((team) => !isTeamHidden(team.last_activity_at as string | null))
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
    (projectRows ?? [])
      .filter((p) => getProjectLifecycleStatus(p.last_activity_at as string | null) !== "ARCHIVED")
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

  const { items: feedItems } = await getFeedItems("all", 1, 3, null);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        <Hero />
        <WhyAzenion />
        <About />
        <Ecosystem />
        <HowItWorks />
        <FeaturedContent teams={teams} projects={projects} />
        <AcademyPreview sessions={sessions} />
        <FeedPreview items={feedItems} />
        <Features />
        <CommunityNumbers
          members={countMembers ?? 0}
          teams={countTeams ?? 0}
          projects={countProjects ?? 0}
          branches={countBranches ?? 0}
        />
        <Roadmap />
        <Faq />
        <FinalCta />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}