import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TeamsHero } from "@/components/sections/teams/hero";
import { MyTeams } from "@/components/sections/teams/my-teams";
import { AllTeams } from "@/components/sections/teams/all-teams";
import type { TeamCardTeam } from "@/components/sections/teams/team-card";
import { WhyTeams } from "@/components/sections/teams/why-teams";
import { CreateTeam } from "@/components/sections/teams/create-team";
import { FutureVision } from "@/components/sections/teams/future-vision";
import { PageBridge } from "@/components/sections/page-bridge";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Teams | Azenion — The Limitless Network",
  description:
    "Explore Azenion's teams — collaborative groups building projects, startups, and innovations across the Limitless Network.",
};

export default async function TeamsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [
    { data: teams, error: teamsError },
    { data: categories },
  ] = await Promise.all([
    supabase
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
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
    supabase
      .from("team_categories")
      .select("id, name, slug")
      .order("name")
      .limit(100),
  ]);

  if (teamsError) {
    console.error("Teams fetch error:", teamsError);
  }

  const teamIds = teams?.map((t) => t.id) ?? [];

  const [
    { data: memberRows },
    { data: projectCountRows },
    { data: updateCountRows },
    { data: openRoleRows },
    { data: categoryMemberRows },
  ] = await Promise.all([
    teamIds.length > 0
      ? supabase.from("team_members").select("team_id").in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? admin.from("projects").select("team_id").in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? admin.from("team_updates").select("team_id").in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? admin.from("team_open_roles").select("team_id, title").in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? supabase.from("team_category_members").select("team_id, category_id").in("team_id", teamIds)
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

  const updateCountMap = new Map<string, number>();
  for (const row of updateCountRows ?? []) {
    updateCountMap.set(row.team_id, (updateCountMap.get(row.team_id) ?? 0) + 1);
  }

  const openRolesMap = new Map<string, { title: string }[]>();
  for (const row of openRoleRows ?? []) {
    const existing = openRolesMap.get(row.team_id) ?? [];
    existing.push({ title: row.title });
    openRolesMap.set(row.team_id, existing);
  }

  // Build team → categories map from pivot (separate query avoids PostgREST FK cache issues)
  const categoryLookup = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of categories ?? []) {
    categoryLookup.set(cat.id, cat);
  }
  const teamCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const edge of categoryMemberRows ?? []) {
    const entries = teamCategoryMap.get(edge.team_id) ?? [];
    const cat = categoryLookup.get(edge.category_id);
    if (cat) entries.push(cat);
    teamCategoryMap.set(edge.team_id, entries);
  }

  const teamsWithCounts = (teams ?? []).map((team) => {
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      description: team.description,
      logo_url: team.logo_url,
      visibility: team.visibility,
      created_at: team.created_at,
      updated_at: team.updated_at as string | null,
      technologies: Array.isArray(team.technologies) ? team.technologies : [],
      categories: teamCategoryMap.get(team.id) ?? [],
      owner: team.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
      member_count: memberCountMap.get(team.id) ?? 0,
      project_count: projectCountMap.get(team.id) ?? 0,
      update_count: updateCountMap.get(team.id) ?? 0,
      open_roles: openRolesMap.get(team.id) ?? [],
    };
  });

  let myTeams: TeamCardTeam[] = [];

  if (user) {
      const { data: myMemberships } = await admin
          .from("team_members")
          .select(`
            role,
            team:team_id (
              id, slug, name, description, logo_url, visibility, created_at, updated_at,
              technologies,
              owner:owner_id ( username, full_name, avatar_url )
            )
          `)
          .eq("user_id", user.id);

        if (myMemberships && myMemberships.length > 0) {
          const myTeamIds = myMemberships.map((m) => (m.team as unknown as { id: string }).id);

          const [
            { data: myMemberRows },
            { data: myProjectCountRows },
            { data: myUpdateCountRows },
            { data: myOpenRoleRows },
            { data: myCategoryEdges },
          ] = await Promise.all([
            admin.from("team_members").select("team_id").in("team_id", myTeamIds),
            admin.from("projects").select("team_id").in("team_id", myTeamIds),
            admin.from("team_updates").select("team_id").in("team_id", myTeamIds),
            admin.from("team_open_roles").select("team_id, title").in("team_id", myTeamIds),
            admin.from("team_category_members").select("team_id, category_id").in("team_id", myTeamIds),
          ]);

          const myMemberCountMap = new Map<string, number>();
          for (const row of myMemberRows ?? []) {
            myMemberCountMap.set(row.team_id, (myMemberCountMap.get(row.team_id) ?? 0) + 1);
          }

          const myProjectCountMap = new Map<string, number>();
          for (const row of myProjectCountRows ?? []) {
            myProjectCountMap.set(row.team_id, (myProjectCountMap.get(row.team_id) ?? 0) + 1);
          }

          const myUpdateCountMap = new Map<string, number>();
          for (const row of myUpdateCountRows ?? []) {
            myUpdateCountMap.set(row.team_id, (myUpdateCountMap.get(row.team_id) ?? 0) + 1);
          }

          const myOpenRolesMap = new Map<string, { title: string }[]>();
          for (const row of myOpenRoleRows ?? []) {
            const existing = myOpenRolesMap.get(row.team_id) ?? [];
            existing.push({ title: row.title });
            myOpenRolesMap.set(row.team_id, existing);
          }

          const myTeamCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
          for (const edge of myCategoryEdges ?? []) {
            const entries = myTeamCategoryMap.get(edge.team_id) ?? [];
            const cat = categoryLookup.get(edge.category_id);
            if (cat) entries.push(cat);
            myTeamCategoryMap.set(edge.team_id, entries);
          }

          myTeams = myMemberships.map((m) => {
            const t = m.team as unknown as {
              id: string;
              slug: string;
              name: string;
              description: string | null;
              logo_url: string | null;
              visibility: string;
              created_at: string | null;
              updated_at: string | null;
              technologies: string[];
              owner: { username: string; full_name: string; avatar_url: string | null } | null;
            };
            return {
              ...t,
              categories: myTeamCategoryMap.get(t.id) ?? [],
              technologies: Array.isArray(t.technologies) ? t.technologies : [],
              member_count: myMemberCountMap.get(t.id) ?? 0,
              project_count: myProjectCountMap.get(t.id) ?? 0,
              update_count: myUpdateCountMap.get(t.id) ?? 0,
              open_roles: myOpenRolesMap.get(t.id) ?? [],
            };
          });
        }
  }

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <TeamsHero />
        {user ? <MyTeams teams={myTeams} /> : null}
        <AllTeams initialTeams={teamsWithCounts} categories={categories ?? []} />
        <WhyTeams />
        <CreateTeam />
        <FutureVision />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
