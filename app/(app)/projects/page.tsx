import type { Metadata } from "next";
import { Rocket } from "lucide-react";

import { Footer } from "@/components/layout/footer";
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
import { getSessionUser } from "@/lib/supabase/user";
import {
  getPublicProjectsPage,
  getProjectsFilterMeta,
} from "@/actions/projects-list.actions";
import { PROJECTS_PAGE_SIZE } from "@/lib/projects-pagination";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Projects | Azenion — The Limitless Network",
  description:
    "Discover projects built by the Azenion community — find collaborators, build real-world products, and turn ideas into reality.",
};

function parseRecruitment(raw: unknown) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const adminClient = createAdminClient();

  // First catalog page (cursor=null, keyset on created_at+id) + filter chips
  // + session load concurrently. Public catalog pages are cached per-cursor
  // (30s); filter meta is cached 5 min. The per-user "my projects" section
  // below stays fully dynamic.
  const [user, firstPage, filterMeta] = await Promise.all([
    getSessionUser(),
    getPublicProjectsPage(null, PROJECTS_PAGE_SIZE),
    getProjectsFilterMeta(),
  ]);
  const { technologyOptions, allCategories } = filterMeta;

  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of allCategories ?? []) {
    categoryMap.set(cat.id, cat);
  }

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

      const [memberRes, catEdgeRes] = await Promise.all([
        adminClient.from("project_members").select("project_id").in("project_id", myProjectIds),
        myProjectIds.length > 0
          ? adminClient.from("project_category_members").select("project_id, category_id").in("project_id", myProjectIds)
          : Promise.resolve({ data: [] as { project_id: string; category_id: string }[] }),
      ]);

      const myMemberRows = memberRes.data;
      const myCategoryEdges = catEdgeRes.data;

      const myMemberCountMap = new Map<string, number>();
      for (const row of myMemberRows ?? []) {
        myMemberCountMap.set(row.project_id, (myMemberCountMap.get(row.project_id) ?? 0) + 1);
      }

      const myCategoryMap = new Map<string, { id: string; name: string; slug: string }[]>();
      for (const edge of myCategoryEdges ?? []) {
        const entries = myCategoryMap.get(edge.project_id) ?? [];
        const cat = categoryMap.get(edge.category_id);
        if (cat) entries.push(cat);
        myCategoryMap.set(edge.project_id, entries);
      }

      // Batch private logo resolution for myProjects (one storage call)
      const PRIVATE_PREFIX = "private-media/";
      const isPrivate = (v: string | null | undefined): boolean => typeof v === "string" && v.startsWith(PRIVATE_PREFIX);
      const objectPath = (m: string) => m.slice(PRIVATE_PREFIX.length);
      const isSafe = (p: string) => p.length > 0 && p.length <= 500 && !p.includes("..") && /^[A-Za-z0-9._\/-]+$/.test(p) && (p.startsWith("team/") || p.startsWith("project/"));
      const privatePaths = new Set<string>();
      for (const m of myMemberships) {
        const p = m.project as unknown as { logo_url: string | null };
        if (isPrivate(p.logo_url)) {
          const op = objectPath(p.logo_url as string);
          if (isSafe(op)) privatePaths.add(op);
        }
      }
      const markerToUrl = new Map<string, string>();
      if (privatePaths.size > 0) {
        try {
          const { data } = await adminClient.storage.from("private-media").createSignedUrls([...privatePaths], 60);
          if (data) for (const e of data) if (!e.error && e.signedUrl && e.path) markerToUrl.set(`${PRIVATE_PREFIX}${e.path}`, e.signedUrl);
        } catch {}
      }

      myProjects = myMemberships.map((m) => {
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
        const rawLogo = p.logo_url;
        const resolvedLogo = rawLogo && isPrivate(rawLogo) ? (markerToUrl.get(rawLogo) ?? null) : rawLogo;
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          logo_url: resolvedLogo,
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
      });
    }
  }

  return (
    <>
      <main id="main" className="relative overflow-hidden">
        <PageAtmosphere />
        {user && myProjects.length === 0 ? (
          <EmptyState
            icon={<Rocket size={32} />}
            title={await serverT("projects.emptyTitle")}
            description={await serverT("projects.emptySub")}
            eyebrow={await serverT("projects.workspace")}
            scrollToId="projects"
            actionLabel={await serverT("projects.exploreProjects")}
          />
        ) : (
          <ProjectsHero />
        )}
        {user && myProjects.length > 0 ? <MyProjects projects={myProjects} /> : null}
        <AllProjects
          initialProjects={firstPage.projects}
          initialNextCursor={firstPage.nextCursor}
          initialHasMore={firstPage.hasMore}
          technologies={technologyOptions}
          categories={allCategories ?? []}
        />
        <CreateProject />
        <WhyBuild />
        <FutureVision />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
