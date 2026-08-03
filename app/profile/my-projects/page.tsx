import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileProjects } from "@/components/sections/profile/profile-projects";
import { ProfileSubpageHeader } from "@/components/sections/profile/profile-subpage-header";
import { ProfileEmptyCard } from "@/components/sections/profile/profile-empty-card";
import { sectionCardClass } from "@/components/sections/profile/card-classes";
import { getCurrentUser, getUserProjects } from "@/lib/profile-data";

export const metadata: Metadata = {
  title: "My Projects | Profile | Azenion",
};

export default async function MyProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await getUserProjects(user.id);

  return (
    <>
      <ProfileSubpageHeader
        title="My Projects"
        description="The projects you have joined or created."
      />
      {projects.length > 0 ? (
        <ProfileProjects projects={projects} cardClass={sectionCardClass} />
      ) : (
        <ProfileEmptyCard
          title="You haven't joined or created any projects yet"
          description="Start a project or join an existing one to turn ideas into reality."
          href="/projects"
          linkLabel="Explore Projects"
          cardClass={sectionCardClass}
        />
      )}
    </>
  );
}
