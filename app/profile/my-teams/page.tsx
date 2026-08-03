import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileTeams } from "@/components/sections/profile/profile-teams";
import { ProfileSubpageHeader } from "@/components/sections/profile/profile-subpage-header";
import { ProfileEmptyCard } from "@/components/sections/profile/profile-empty-card";
import { sectionCardClass } from "@/components/sections/profile/card-classes";
import { getCurrentUser, getUserTeams } from "@/lib/profile-data";

export const metadata: Metadata = {
  title: "My Teams | Profile | Azenion",
};

export default async function MyTeamsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const teams = await getUserTeams(user.id);

  return (
    <>
      <ProfileSubpageHeader
        title="My Teams"
        description="The teams you belong to across the Limitless Network."
      />
      {teams.length > 0 ? (
        <ProfileTeams teams={teams} cardClass={sectionCardClass} />
      ) : (
        <ProfileEmptyCard
          title="You're not part of any teams yet"
          description="Join a team to build with collaborators across campuses and borders."
          href="/teams"
          linkLabel="Explore Teams"
          cardClass={sectionCardClass}
        />
      )}
    </>
  );
}
