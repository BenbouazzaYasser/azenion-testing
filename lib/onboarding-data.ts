import { createAdminClient } from "@/lib/supabase/admin";
import { getTrendingTeamIds, getFeaturedProjectIds } from "@/actions/ranking.actions";
import { isTeamHidden, getProjectLifecycleStatus, MS_PER_DAY } from "@/lib/lifecycle";

export type OnboardingStep =
  | "welcome"
  | "profile"
  | "branch"
  | "team"
  | "project"
  | "done";

export interface OnboardingProfileSubset {
  full_name: string | null;
  username: string;
  bio: string | null;
  institution: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface OnboardingBranchOption {
  id: string;
  slug: string;
  name: string;
  institution: string | null;
  logo_url: string | null;
  member_count: number;
  recommended: boolean;
}

export interface OnboardingTeamOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  member_count: number;
  trending: boolean;
}

export interface OnboardingProjectOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  member_count: number;
}

export interface OnboardingData {
  visible: boolean;
  completed: boolean;
  step: OnboardingStep | null;
  profile: OnboardingProfileSubset;
  currentBranch: { id: string; slug: string; name: string } | null;
  branches: OnboardingBranchOption[];
  teams: OnboardingTeamOption[];
  projects: OnboardingProjectOption[];
}

const NEW_ACCOUNT_WINDOW_DAYS = 2;

export async function loadOnboardingData(userId: string): Promise<OnboardingData> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, username, bio, institution, avatar_url, created_at, onboarding_step, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  const completed = Boolean(profile?.onboarding_completed_at);
  const persistedStep = (profile?.onboarding_step as OnboardingStep | null) ?? null;

  const profileCreatedAt = profile?.created_at ? new Date(profile.created_at).getTime() : 0;
  const isNewAccount =
    profileCreatedAt > 0 && Date.now() - profileCreatedAt < NEW_ACCOUNT_WINDOW_DAYS * MS_PER_DAY;

  // Optional: hand-off whether onboarding should auto-show.
  const visible = !completed && (persistedStep !== null || isNewAccount);

  const profileSubset: OnboardingProfileSubset = {
    full_name: profile?.full_name ?? null,
    username: profile?.username ?? "",
    bio: profile?.bio ?? null,
    institution: profile?.institution ?? null,
    avatar_url: profile?.avatar_url ?? null,
    created_at: profile?.created_at ?? null,
  };

  // ── Current branch membership ────────────────────────────────────────────

  const { data: membership } = await admin
    .from("branch_members")
    .select("branch_id, branch:branches(id, slug, name)")
    .eq("user_id", userId)
    .maybeSingle();

  const currentBranch = (membership?.branch as unknown as { id: string; slug: string; name: string } | null) ?? null;

  // ── Recommendations ──────────────────────────────────────────────────────

  const [branches, branchCounts] = await Promise.all([
    admin.from("branches").select("id, slug, name, full_name, logo_url").order("name"),
    admin.from("branch_members").select("branch_id"),
  ]);

  const countMap = new Map<string, number>();
  for (const r of branchCounts?.data ?? []) {
    countMap.set(r.branch_id, (countMap.get(r.branch_id) ?? 0) + 1);
  }

  const branchRows = (branches?.data ?? []).map((b) => ({
    ...b,
    institution: b.full_name ?? null,
    member_count: countMap.get(b.id) ?? 0,
  }));

  const preferredInstitution = profileSubset.institution?.trim()?.toLowerCase();
  let branchList = branchRows.map((b, i) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    institution: b.institution,
    logo_url: b.logo_url,
    member_count: b.member_count,
    recommended: false,
  }));

  if (branchList.length > 0) {
    const byInstitution = preferredInstitution
      ? branchList.find(
          (b) =>
            b.institution?.toLowerCase().includes(preferredInstitution) ||
            preferredInstitution.includes(b.institution?.toLowerCase() ?? ""),
        )
      : undefined;
    const recommended =
      byInstitution ?? [...branchList].sort((a, b) => b.member_count - a.member_count)[0];
    if (recommended) {
      branchList = branchList.map((b) => ({ ...b, recommended: b.id === recommended.id }));
    }
    branchList.sort(
      (a, b) =>
        Number(b.recommended) - Number(a.recommended) ||
        b.member_count - a.member_count,
    );
    branchList = branchList.slice(0, 4);
  }

  // ── Featured + newest projects ───────────────────────────────────────────

  const featuredProjectIds = await getFeaturedProjectIds(8);
  const { data: projectRows } = await admin
    .from("projects")
    .select("id, slug, name, description, logo_url, last_activity_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(30);

  const activeProjects = (projectRows ?? []).filter(
    (p) =>
      getProjectLifecycleStatus((p as { last_activity_at: string | null }).last_activity_at) !== "ARCHIVED",
  );

  const projectIds = activeProjects.map((p) => p.id);
  const { data: projectMemberRows } =
    projectIds.length > 0
      ? await admin.from("project_members").select("project_id").in("project_id", projectIds)
      : { data: [] };

  const projectCountMap = new Map<string, number>();
  for (const r of projectMemberRows ?? []) {
    projectCountMap.set(r.project_id, (projectCountMap.get(r.project_id) ?? 0) + 1);
  }

  const projectRank = new Map(featuredProjectIds.map((id, i) => [id, i]));
  const orderedProjects = [...activeProjects].sort((a, b) => {
    const ra = projectRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = projectRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  const projects: OnboardingProjectOption[] = orderedProjects
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      logo_url: p.logo_url,
      member_count: projectCountMap.get(p.id) ?? 0,
    }));

  // ── Trending + newest teams ──────────────────────────────────────────────

  const trendingTeamIds = await getTrendingTeamIds(10);
  const { data: teamRows } = await admin
    .from("teams")
    .select("id, slug, name, description, logo_url, last_activity_at, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(40);

  const activeTeams = (teamRows ?? []).filter(
    (t) => !isTeamHidden((t as { last_activity_at: string | null }).last_activity_at),
  );

  const teamIds = activeTeams.map((t) => t.id);
  const { data: teamMemberRows } =
    teamIds.length > 0
      ? await admin.from("team_members").select("team_id").in("team_id", teamIds)
      : { data: [] };

  const teamCountMap = new Map<string, number>();
  for (const r of teamMemberRows ?? []) {
    teamCountMap.set(r.team_id, (teamCountMap.get(r.team_id) ?? 0) + 1);
  }

  const teamRank = new Map(trendingTeamIds.map((id, i) => [id, i]));
  const orderedTeams = [...activeTeams].sort((a, b) => {
    const ra = teamRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = teamRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  const teams: OnboardingTeamOption[] = orderedTeams.slice(0, 5).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    logo_url: t.logo_url,
    member_count: teamCountMap.get(t.id) ?? 0,
    trending: teamRank.has(t.id),
  }));

  return {
    visible,
    completed,
    step: persistedStep,
    profile: profileSubset,
    currentBranch,
    branches: branchList,
    teams,
    projects,
  };
}