import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ProfileHeader } from "@/components/sections/profile/profile-header";
import { ProfileStats } from "@/components/sections/profile/profile-stats";
import { ProfileDetails } from "@/components/sections/profile/profile-details";
import { ProfileTimeline } from "@/components/sections/profile/profile-timeline";
import { ProfileTeams } from "@/components/sections/profile/profile-teams";
import { ProfileAccount } from "@/components/sections/profile/profile-account";
import { ProfileProjects } from "@/components/sections/profile/profile-projects";

const cardBase =
  "rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl";
const sectionCardClass = `${cardBase} px-6 py-8 sm:px-10 sm:py-9`;
const statCardClass = `${cardBase} px-6 py-6 sm:px-7 sm:py-7`;

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[profile] failed to fetch profile row:", profileError.message);
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
      console.error("[profile] self-healing INSERT failed:", createError.message);
    } else {
      profile = created;
    }
  }

  const [{ data: activities }, { data: membership }, { data: userTeamsData }, { data: userProjectMembers }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("branch_members")
      .select("branch:branches(name, slug)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("get_user_teams", { p_user_id: user.id }),
    supabase
      .from("project_members")
      .select("role, project:project_id(id, slug, name, logo_url, visibility, technologies)")
      .eq("user_id", user.id),
  ]);

  const activitiesList = activities ?? [];
  const userBranch = (membership?.branch as unknown as { name: string; slug: string } | undefined) ?? null;

  const userTeams = (userTeamsData ?? []) as {
    team_id: string;
    role: string;
    team_slug: string;
    team_name: string;
    team_logo_url: string | null;
  }[];

  const teams = userTeams.map((t) => ({
    id: t.team_id,
    slug: t.team_slug,
    name: t.team_name,
    logo_url: t.team_logo_url,
    role: t.role,
  }));

  const rawProjectList = (userProjectMembers ?? []).map((pm) => {
    const p = pm.project as unknown as { id: string; slug: string; name: string; logo_url: string | null; visibility: string; technologies: string[] } | null;
    return p ? { ...p, role: pm.role } : null;
  }).filter(Boolean) as {
    id: string; slug: string; name: string; logo_url: string | null; visibility: string; technologies: string[]; role: string;
  }[];

  const { data: profileMemberCountRows } = rawProjectList.length > 0
    ? await supabase.from("project_members").select("project_id").in("project_id", rawProjectList.map(p => p.id))
    : { data: [] };
  const profileMemberCountMap = new Map<string, number>();
  for (const row of profileMemberCountRows ?? []) {
    profileMemberCountMap.set(row.project_id, (profileMemberCountMap.get(row.project_id) ?? 0) + 1);
  }

  const projectList = rawProjectList.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    logo_url: p.logo_url,
    role: p.role,
    visibility: p.visibility ?? "open",
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    member_count: profileMemberCountMap.get(p.id) ?? 0,
  }));

  const headerProps = {
    id: profile?.id ?? user.id,
    username: profile?.username ?? "",
    full_name: profile?.full_name ?? "",
    bio: profile?.bio ?? null,
    avatar_url: profile?.avatar_url ?? null,
    github_url: profile?.github_url ?? null,
    linkedin_url: profile?.linkedin_url ?? null,
    skills: profile?.skills ?? [],
    institution: profile?.institution ?? null,
    created_at: profile?.created_at ?? user.created_at,
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-[#050507] pt-[112px]">
        <div className="mx-auto max-w-[960px] space-y-8 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <ProfileHeader profile={headerProps} branch={userBranch} cardClass={sectionCardClass} />
          <ProfileStats branch={userBranch} teamsCount={teams.length} projectsCount={projectList.length} activitiesCount={activitiesList.length} cardClass={statCardClass} />
          <ProfileProjects projects={projectList} cardClass={sectionCardClass} />
          <ProfileTeams teams={teams} cardClass={sectionCardClass} />
          <ProfileDetails profile={profile} cardClass={sectionCardClass} />
          <ProfileTimeline activities={activitiesList} cardClass={sectionCardClass} />
          <ProfileAccount
            profileUserId={profile?.id ?? user.id}
            currentUserId={user.id}
            email={user.email ?? ""}
            emailVerified={!!user.email_confirmed_at}
            createdAt={user.created_at}
            lastSignInAt={user.last_sign_in_at ?? null}
            cardClass={sectionCardClass}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
