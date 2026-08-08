import type { Metadata } from "next";
import { Rocket } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { ProjectsHero } from "@/components/sections/projects/hero";
import { AllProjects } from "@/components/sections/projects/all-projects";
import { MyProjects } from "@/components/sections/projects/my-projects";
import { CreateProject } from "@/components/sections/projects/create-project";
import { WhyBuild } from "@/components/sections/projects/why-build";
import { FutureVision } from "@/components/sections/projects/future-vision";
import { EmptyState } from "@/components/ui/empty-state";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectLifecycleStatus } from "@/lib/lifecycle";
import { resolveMediaValue } from "@/lib/media";

export const metadata: Metadata = {
  title: "Projects | Azenion — The Limitless Network",
  description:
    "Discover projects built by the Azenion community — find collaborators, build real-world products, and turn ideas into reality.",
};

export default async function ProjectsPage() {
  const adminClient = createAdminClient();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: projects } = await adminClient
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
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: memberRows } = projectIds.length > 0
    ? await adminClient.from("project_members").select("project_id").in("project_id", projectIds)
    : { data: [] };

  const memberCountMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountMap.set(row.project_id, (memberCountMap.get(row.project_id) ?? 0) + 1);
  }

  const allTechs = new Set<string>();
  for (const p of projects ?? []) {
    if (p.technologies && Array.isArray(p.technologies)) {
      for (const t of p.technologies) {
        if (t) allTechs.add(t);
      }
    }
  }
  const technologyOptions = [...allTechs].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  const { data: projectCategoryEdges } = projectIds.length > 0
    ? await adminClient.from("project_category_members").select("project_id, category_id").in("project_id", projectIds)
    : { data: [] };

  const projectCategoryMap = new Map<string, string[]>();
  for (const edge of projectCategoryEdges ?? []) {
    const ids = projectCategoryMap.get(edge.project_id) ?? [];
    ids.push(edge.category_id);
    projectCategoryMap.set(edge.project_id, ids);
  }

  const { data: allCategories } = await adminClient
    .from("project_categories")
    .select("id, name, slug")
    .order("name");

  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of allCategories ?? []) {
    categoryMap.set(cat.id, cat);
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

  const visibleProjects = await Promise.all(
    (projects ?? [])
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
    categories: (projectCategoryMap.get(p.id) ?? []).map((cid) => categoryMap.get(cid)).filter(Boolean) as { id: string; name: string; slug: string }[],
    owner: p.owner as unknown as { username: string; full_name: string; avatar_url: string | null } | null,
    team: p.team as unknown as { name: string; slug: string } | null,
    member_count: memberCountMap.get(p.id) ?? 0,
    }))
  );

  let myProjects: {
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
    team: { name: string; slug: string } | null;
    member_count: number;
    role: "owner" | "admin" | "member" | null;
  }[] = [];

  if (user) {
    const { data: myMemberships } = await adminClient
      .from("project_members")
      .select(`
        role,
        project:project_id (
          id, slug, name, description, logo_url, visibility, lifecycle_status,
          last_activity_at, created_at, updated_at,
          technologies, recruitment,
          owner:owner_id ( username, full_name, avatar_url ),
          team:team_id ( name, slug )
        )
      `)
      .eq("user_id", user.id);

    if (myMemberships && myMemberships.length > 0) {
      const myProjectIds = myMemberships.map(
        (m) => (m.project as unknown as { id: string }).id
      );

      const { data: myMemberRows } = await adminClient
        .from("project_members")
        .select("project_id")
        .in("project_id", myProjectIds);

      const myMemberCountMap = new Map<string, number>();
      for (const row of myMemberRows ?? []) {
        myMemberCountMap.set(row.project_id, (myMemberCountMap.get(row.project_id) ?? 0) + 1);
      }

      const { data: myCategoryEdges } = myProjectIds.length > 0
        ? await adminClient.from("project_category_members").select("project_id, category_id").in("project_id", myProjectIds)
        : { data: [] };

      const myCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
      for (const edge of myCategoryEdges ?? []) {
        const entries = myCategoryMap.get(edge.project_id) ?? [];
        const cat = categoryMap.get(edge.category_id);
        if (cat) entries.push(cat);
        myCategoryMap.set(edge.project_id, entries);
      }

      myProjects = await Promise.all(
        myMemberships.map(async (m) => {
        const p = m.project as unknown as {
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
          recruitment: unknown;
          owner: { username: string; full_name: string; avatar_url: string | null } | null;
          team: { name: string; slug: string } | null;
        };
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          logo_url: ((await resolveMediaValue(p.logo_url, undefined, supabase)) as string | null) ?? null,
          visibility: p.visibility,
          lifecycle_status: p.lifecycle_status,
          last_activity_at: p.last_activity_at,
          created_at: p.created_at,
          updated_at: p.updated_at,
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
          recruitment: parseRecruitment(p.recruitment) as {
            id: string;
            title: string;
            experience: "beginner" | "intermediate" | "advanced";
            positions: number;
            description: string;
          }[],
          categories: myCategoryMap.get(p.id) ?? [],
          owner: p.owner,
          team: p.team,
          member_count: myMemberCountMap.get(p.id) ?? 0,
          role: m.role as "owner" | "admin" | "member",
        };
      })
      );
    }
  }

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        {user && myProjects.length === 0 ? (
          <EmptyState
            icon={<Rocket size={32} />}
            title="No projects yet"
            description="You haven't joined or created any projects yet."
            eyebrow="Your workspace"
            scrollToId="projects"
            actionLabel="Explore Projects"
          />
        ) : (
          <ProjectsHero />
        )}
        {user && myProjects.length > 0 ? <MyProjects projects={myProjects} /> : null}
        <AllProjects initialProjects={visibleProjects} technologies={technologyOptions} categories={allCategories ?? []} />
        <CreateProject />
        <WhyBuild />
        <FutureVision />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
