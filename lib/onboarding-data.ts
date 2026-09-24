import { createAdminClient } from "@/lib/supabase/admin";
import { getTrendingTeamIds, getFeaturedProjectIds } from "@/actions/ranking.actions";
import { isTeamHidden, getProjectLifecycleStatus, LIFECYCLE, MS_PER_DAY } from "@/lib/lifecycle";

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

  // If onboarding is not visible, skip heavy recommendation queries — this is
  // the common path for 95%+ of authenticated users (already completed).
  // We still need a minimal shape for the provider, but no branches/teams/projects.
  if (!visible) {
    return {
      visible: false,
      completed,
      step: persistedStep,
      profile: profileSubset,
      currentBranch: null,
      branches: [],
      teams: [],
      projects: [],
    };
  }

  // ── Recommendations: fetch all independent data in parallel ──────────────
  // Member counts come from the grouped RPC (1 small result set); when the
  // migration is not applied yet, fall back to the full membership scan.
  // Lifecycle filters are pushed into SQL (mirrors getProjectLifecycleStatus /
  // isTeamHidden: a null activity date counts as active/visible) and the JS
  // filter below stays as the authoritative safety net.
  const projectArchiveCutoffIso = new Date(
    Date.now() - LIFECYCLE.projectArchiveDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const teamHiddenCutoffIso = new Date(
    Date.now() - LIFECYCLE.teamHiddenDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [membershipRes, branchesRes, branchCountsRes, featuredProjectIds, trendingTeamIds, projectRowsRes, teamRowsRes] =
    await Promise.all([
      admin.from("branch_members").select("branch_id, branch:branches(id, slug, name)").eq("user_id", userId).maybeSingle(),
      admin.from("branches").select("id, slug, name, full_name, logo_url").order("name"),
      admin.rpc("get_branch_member_counts"),
      getFeaturedProjectIds(8),
      getTrendingTeamIds(10),
      admin
        .from("projects")
        .select("id, slug, name, description, logo_url, last_activity_at")
        .eq("visibility", "public")
        .or(`last_activity_at.is.null,last_activity_at.gt.${projectArchiveCutoffIso}`)
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("teams")
        .select("id, slug, name, description, logo_url, last_activity_at, created_at")
        .eq("visibility", "public")
        .or(`last_activity_at.is.null,last_activity_at.gt.${teamHiddenCutoffIso}`)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const membership = membershipRes.data as unknown as { branch: { id: string; slug: string; name: string } | null } | null;
  const currentBranch = (membership?.branch as unknown as { id: string; slug: string; name: string } | null) ?? null;
  const branches = branchesRes;
  const projectRows = projectRowsRes.data;
  const teamRows = teamRowsRes.data;

  const countMap = new Map<string, number>();
  if (!branchCountsRes.error) {
    for (const r of (branchCountsRes.data ?? []) as { branch_id: string; member_count: number | string }[]) {
      countMap.set(r.branch_id, Number(r.member_count ?? 0));
    }
  } else {
    // Fallback (pre-00150): full membership scan counted in JS.
    const { data: allMemberships } = await admin.from("branch_members").select("branch_id");
    for (const r of (allMemberships ?? []) as { branch_id: string }[]) {
      countMap.set(r.branch_id, (countMap.get(r.branch_id) ?? 0) + 1);
    }
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

  // featuredProjectIds & projectRows already fetched in parallel above

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

  // trendingTeamIds & teamRows already fetched in parallel above

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