import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { ProjectPageHero } from "@/components/sections/projects/project-page-hero";
import { ProjectPageAbout } from "@/components/sections/projects/project-page-about";
import { ProjectPageRecruitment } from "@/components/sections/projects/project-page-recruitment";
import { ProjectPageMembers } from "@/components/sections/projects/project-page-members";
import { ProjectPageActivity } from "@/components/sections/projects/project-page-activity";
import { ProjectPageUpdates } from "@/components/sections/projects/project-page-updates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: project } = await adminClient
    .from("projects")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) return {};

  return {
    title: `${project.name} | Azenion — The Limitless Network`,
    description: project.description ?? `Learn more about ${project.name} on Azenion.`,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const supabase = createClient();

  const { data: project } = await adminClient
    .from("projects")
    .select(`
      *,
      team:team_id ( name, slug ),
      owner:owner_id ( id, username, full_name, avatar_url )
    `)
    .eq("slug", slug)
    .maybeSingle() as unknown as {
      data: (Record<string, unknown> & {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        description_long: string | null;
        logo_url: string | null;
        visibility: string;
        website: string | null;
        github_url: string | null;
        technologies: string[];
        recruitment: string;
        created_at: string | null;
        updated_at: string | null;
        team_id: string;
        owner_id: string;
        team: { name: string; slug: string } | null;
        owner: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
      }) | null;
      error: unknown;
    };

  if (!project) notFound();

  const { data: teamBranchRow } = await adminClient
    .from("teams")
    .select("branch:branch_id ( id, name, slug )")
    .eq("id", project.team_id)
    .maybeSingle();

  const branchData =
    ((teamBranchRow as unknown as { branch: { id: string; name: string; slug: string } | null } | null)
      ?.branch ?? null);

  const { data: { user } } = await supabase.auth.getUser();

  if (project.visibility === "private") {
    if (!user) notFound();
    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) notFound();
  }

  const { data: members } = await adminClient
    .from("project_members")
    .select(`
      role,
      joined_at,
      user:user_id ( id, username, full_name, avatar_url )
    `)
    .eq("project_id", project.id)
    .order("joined_at", { ascending: true });

  const { data: activities } = await adminClient
    .from("activities")
    .select("*")
    .filter("metadata->>project_id", "eq", project.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: rawUpdates } = await adminClient
    .from("project_updates")
    .select("*, author:author_id ( id, username, full_name, avatar_url )")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const updateIds = (rawUpdates ?? []).map((u) => u.id);
  const [{ data: updateLikes }, { data: updateComments }] = await Promise.all([
    updateIds.length > 0
      ? adminClient.from("update_likes").select("target_id").eq("target_type", "project_update").in("target_id", updateIds)
      : Promise.resolve({ data: [] }),
    updateIds.length > 0
      ? adminClient.from("update_comments").select("target_id").eq("target_type", "project_update").in("target_id", updateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const likeCounts: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  for (const id of updateIds) { likeCounts[id as string] = 0; commentCounts[id as string] = 0; }
  for (const l of updateLikes ?? []) { likeCounts[l.target_id] = (likeCounts[l.target_id] ?? 0) + 1; }
  for (const c of updateComments ?? []) { commentCounts[c.target_id] = (commentCounts[c.target_id] ?? 0) + 1; }

  const userLikeTargets = new Set<string>();
  if (user) {
    const { data: userLikes } = updateIds.length > 0
      ? await supabase.from("update_likes").select("target_id").eq("user_id", user.id).eq("target_type", "project_update").in("target_id", updateIds)
      : { data: [] };
    for (const l of userLikes ?? []) userLikeTargets.add(l.target_id);
  }

  let userRole: string | null = null;
  let currentMember: { role: string } | null = null;

  if (user && members) {
    currentMember = members.find(
      (m) => m.user && typeof m.user === "object" && "id" in m.user && (m.user as { id: string }).id === user.id
    ) ?? null;
    userRole = currentMember?.role ?? null;
  }

  const isMember = !!currentMember;

  const updates = (rawUpdates ?? []).map((u: Record<string, unknown>) => ({
    id: u.id as string,
    title: u.title as string,
    body: u.body as string | null,
    image_url: u.image_url as string | null,
    created_at: u.created_at as string,
    updated_at: u.updated_at as string,
    author: u.author as {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    },
    like_count: likeCounts[u.id as string] ?? 0,
    comment_count: commentCounts[u.id as string] ?? 0,
    user_has_liked: userLikeTargets.has(u.id as string),
  }));

  const projectTeam = project.team as unknown as { name: string; slug: string } | null;
  const projectOwner = project.owner as unknown as {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;

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

  const userCanManage = userRole === "owner" || userRole === "admin";

  const recruitment = (() => {
    try {
      return typeof project.recruitment === "string"
        ? JSON.parse(project.recruitment)
        : project.recruitment ?? [];
    } catch {
      return [];
    }
  })();

  const { data: projectCategoryMembers } = await adminClient
    .from("project_category_members")
    .select("category_id")
    .eq("project_id", project.id);

  const projectCategoryIds = (projectCategoryMembers ?? []).map((m) => m.category_id);

  const { data: allCategories } = await adminClient
    .from("project_categories")
    .select("id, name, slug")
    .order("name");

  const projectCategories = (allCategories ?? [])
    .filter((c) => projectCategoryIds.includes(c.id))
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  const projectData = {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description,
    description_long: project.description_long,
    logo_url: project.logo_url,
    visibility: project.visibility,
    website: project.website,
    github_url: project.github_url,
    technologies: project.technologies ?? [],
    recruitment,
    categories: projectCategories,
    member_count: membersWithProfiles.length,
    team: projectTeam,
    owner: projectOwner,
    branch: branchData,
    lifecycle_status: project.lifecycle_status as string | null,
    last_activity_at: project.last_activity_at as string | null,
  };

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <PageAtmosphere />
        <ProjectPageHero
          project={projectData}
          isMember={!!currentMember}
          currentUserId={user?.id ?? null}
          userRole={userRole}
          members={membersWithProfiles.map((m) => ({
            id: m.profile.id,
            full_name: m.profile.full_name,
            username: m.profile.username,
            avatar_url: m.profile.avatar_url,
            role: m.role,
          }))}
          allCategories={allCategories ?? []}
        />
        {project.description || project.description_long || project.website || project.github_url || (project.technologies && project.technologies.length > 0) || projectCategories.length > 0 ? (
          <ProjectPageAbout
            description={project.description ?? ""}
            descriptionLong={project.description_long}
            website={project.website}
            githubUrl={project.github_url}
            technologies={project.technologies ?? []}
            categories={projectCategories}
            team={projectTeam}
            visibility={project.visibility}
          />
        ) : null}
        {recruitment.length > 0 ? <ProjectPageRecruitment roles={recruitment} /> : null}
        <ProjectPageMembers members={membersWithProfiles} />
        <ProjectPageUpdates
          projectId={project.id}
          projectSlug={project.slug}
          updates={updates}
          currentUserId={user?.id ?? null}
          isMember={isMember}
        />
        {activities && activities.length > 0 ? (
          <ProjectPageActivity
            activities={activities.map((a) => ({
              type: a.type,
              metadata: a.metadata as Record<string, unknown>,
              created_at: a.created_at ?? "",
            }))}
          />
        ) : null}
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
