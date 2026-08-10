import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { resolveMediaValue } from "@/lib/media";

export type UserTeam = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string;
};

export type UserProject = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string;
  visibility: string;
  technologies: string[];
  member_count: number;
};

export type UserBranch = {
  name: string;
  slug: string;
  role: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getOrCreateProfile(user: User) {
  const supabase = createClient();

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    // Profile fetch failed, will attempt self-healing insert
  }

  if (!profile) {
    const fallbackUsername =
      (user.user_metadata?.username as string | undefined) ??
      user.email?.split("@")[0] ??
      `user-${user.id.slice(0, 8)}`;

    const fallbackFullName = (user.user_metadata?.full_name as string | undefined) ?? "";

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: fallbackUsername, full_name: fallbackFullName })
      .select("*")
      .single();

    if (createError) {
      // Self-healing INSERT failed
    } else {
      profile = created;
    }
  }

  return profile;
}

export async function getUserBranch(userId: string): Promise<UserBranch | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("branch_members")
    .select("role, branch:branches(name, slug)")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const branch = data.branch as unknown as { name: string; slug: string } | null;
  if (!branch) return null;

  return { ...branch, role: (data.role as string) ?? "member" };
}

export async function getUserTeams(userId: string): Promise<UserTeam[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_user_teams", { p_user_id: userId });

  const rows = (data ?? []) as {
    team_id: string;
    role: string;
    team_slug: string;
    team_name: string;
    team_logo_url: string | null;
  }[];

  return await Promise.all(
    rows.map(async (t) => ({
      id: t.team_id,
      slug: t.team_slug,
      name: t.team_name,
      logo_url: ((await resolveMediaValue(t.team_logo_url, undefined, supabase)) as string | null) ?? null,
      role: t.role,
    })),
  );
}

export async function getUserProjects(userId: string): Promise<UserProject[]> {
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("project_members")
    .select("role, project:project_id(id, slug, name, logo_url, visibility, technologies)")
    .eq("user_id", userId);

  const raw = (memberships ?? [])
    .map((pm) => {
      const p = pm.project as unknown as {
        id: string;
        slug: string;
        name: string;
        logo_url: string | null;
        visibility: string | null;
        technologies: string[] | null;
      } | null;
      return p ? { ...p, role: pm.role as string } : null;
    })
    .filter(Boolean) as {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    visibility: string | null;
    technologies: string[] | null;
    role: string;
  }[];

  const projectIds = raw.map((p) => p.id);
  const { data: countRows } =
    projectIds.length > 0
      ? await supabase
          .from("project_members")
          .select("project_id")
          .in("project_id", projectIds)
      : { data: [] };

  const countMap = new Map<string, number>();
  for (const row of countRows ?? []) {
    countMap.set(row.project_id, (countMap.get(row.project_id) ?? 0) + 1);
  }

  return await Promise.all(
    raw.map(async (p) => ({
      ...p,
      logo_url: ((await resolveMediaValue(p.logo_url, undefined, supabase)) as string | null) ?? null,
      visibility: p.visibility ?? "open",
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      member_count: countMap.get(p.id) ?? 0,
    })),
  );
}

export async function getUserActivities(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, creator:user_id ( username, full_name )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((activity) => ({
    id: activity.id,
    type: activity.type,
    metadata: activity.metadata ?? {},
    created_at: activity.created_at,
    creator_name: activityCreatorName(activity.creator),
  }));
}

function activityCreatorName(creator: unknown): string | null {
  const entry = Array.isArray(creator) ? creator[0] : creator;
  if (!entry) return null;
  const fullName = (entry as { full_name?: unknown })?.full_name;
  const username = (entry as { username?: unknown })?.username;
  return (
    (typeof fullName === "string" && fullName.trim()) ||
    (typeof username === "string" && username.trim()) ||
    null
  );
}

export type UserInvitation = {
  id: string;
  team_id: string;
  team_name: string;
  team_slug: string;
  team_logo_url: string | null;
  invited_by_username: string | null;
  invited_by_full_name: string | null;
  status: string;
  created_at: string;
};

export async function getUserInvitations(): Promise<UserInvitation[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_my_team_invitations");

  return (data ?? []) as UserInvitation[];
}
