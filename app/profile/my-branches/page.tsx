import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileBranches } from "@/components/sections/profile/profile-branches";
import { ProfileSubpageHeader } from "@/components/sections/profile/profile-subpage-header";
import { ProfileEmptyCard } from "@/components/sections/profile/profile-empty-card";
import { sectionCardClass } from "@/components/sections/profile/card-classes";
import { getCurrentUser, getUserBranch } from "@/lib/profile-data";

export const metadata: Metadata = {
  title: "My Branches | Profile | Azenion",
};

export default async function MyBranchesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const branch = await getUserBranch(user.id);

  return (
    <>
      <ProfileSubpageHeader
        title="My Branches"
        description="Your campus hub within the Limitless Network."
      />
      {branch ? (
        <ProfileBranches branches={[branch]} cardClass={sectionCardClass} />
      ) : (
        <ProfileEmptyCard
          title="You haven't joined a branch yet"
          description="Join your campus branch to connect with builders near you."
          href="/branches"
          linkLabel="Explore Branches"
          cardClass={sectionCardClass}
        />
      )}
    </>
  );
}
