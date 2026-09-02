import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileHeader } from "@/components/sections/profile/profile-header";
import { ProfileStats } from "@/components/sections/profile/profile-stats";
import { ProfileDetails } from "@/components/sections/profile/profile-details";
import { ProfileTimeline } from "@/components/sections/profile/profile-timeline";
import { ProfileAccount } from "@/components/sections/profile/profile-account";
import { PendingInvitations } from "@/components/sections/profile/pending-invitations";
import { sectionCardClass, statCardClass } from "@/components/sections/profile/card-classes";
import {
  getCurrentUser,
  getOrCreateProfile,
  getUserBranch,
  getUserTeams,
  getUserProjects,
  getUserActivities,
  getUserInvitations,
} from "@/lib/profile-data";
import { getSavedPostsCount } from "@/data/interactions";

export const metadata: Metadata = {
  title: "Profile | Azenion",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [profile, branch, teams, projects, activities, invitations, savedPostsCount] = await Promise.all([
    getOrCreateProfile(user),
    getUserBranch(user.id),
    getUserTeams(user.id),
    getUserProjects(user.id),
    getUserActivities(user.id),
    getUserInvitations(),
    getSavedPostsCount(user.id),
  ]);

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
      <ProfileHeader profile={headerProps} branch={branch} cardClass={sectionCardClass} />
      <ProfileStats
        branch={branch}
        teamsCount={teams.length}
        projectsCount={projects.length}
        activitiesCount={activities.length}
        savedPostsCount={savedPostsCount}
        cardClass={statCardClass}
      />
      <PendingInvitations invitations={invitations} cardClass={sectionCardClass} />
      <ProfileDetails profile={profile} cardClass={sectionCardClass} />
      <ProfileTimeline activities={activities} cardClass={sectionCardClass} />
      <ProfileAccount
        profileUserId={profile?.id ?? user.id}
        currentUserId={user.id}
        email={user.email ?? ""}
        emailVerified={!!user.email_confirmed_at}
        createdAt={user.created_at}
        lastSignInAt={user.last_sign_in_at ?? null}
        cardClass={sectionCardClass}
      />
    </>
  );
}
