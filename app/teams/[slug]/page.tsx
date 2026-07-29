import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageBridge } from "@/components/sections/page-bridge";
import { TeamHero } from "@/components/sections/teams/team-hero";
import { TeamAbout } from "@/components/sections/teams/team-about";
import { TeamRoles } from "@/components/sections/teams/team-roles";
import { TeamProjects } from "@/components/sections/teams/team-projects";
import { TeamMembers } from "@/components/sections/teams/team-members";
import { TeamValues } from "@/components/sections/teams/team-values";
import { TeamJoinCta } from "@/components/sections/teams/team-join-cta";
import { getTeamBySlug, teams } from "@/data/teams";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const team = getTeamBySlug(slug);

  if (!team) return {};

  return {
    title: `${team.name} | Azenion — The Limitless Network`,
    description: team.tagline,
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const team = getTeamBySlug(slug);

  if (!team) notFound();

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden bg-[#050507]">
        <TeamHero team={team} />
        <TeamAbout team={team} />
        <TeamRoles team={team} />
        <TeamProjects team={team} />
        <TeamMembers team={team} />
        <TeamValues team={team} />
        <TeamJoinCta team={team} />
        <PageBridge />
      </main>
      <Footer />
    </>
  );
}
