import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { TeamCard, type TeamCardTeam } from "@/components/sections/teams/team-card";
import { ProjectCard, type ProjectCardProject } from "@/components/sections/projects/project-card";

interface FeaturedContentProps {
  teams: TeamCardTeam[];
  projects: ProjectCardProject[];
}

export function FeaturedContent({ teams, projects }: FeaturedContentProps) {
  const featuredTeams = teams.slice(0, 3);
  const featuredProjects = projects.slice(0, 2);
  const projectOverflow = Math.max(0, projects.length - 2);

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="featured-content-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                Featured
              </span>
              <h2
                id="featured-content-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                What the network is <span className="text-accent-400">building right now.</span>
              </h2>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/teams">
                Browse all teams
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </Reveal>

        {featuredTeams.length > 0 ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredTeams.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </div>
        ) : null}

        {featuredProjects.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
            <Reveal delay={featuredProjects.length * 60}>
              <Link href="/projects" className="group block h-full">
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border-strong bg-white/[0.01] p-8 text-center transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:shadow-glow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08] text-accent-300">
                    <Plus size={20} />
                  </span>
                  <p className="text-lg font-semibold text-ink-50">
                    {projectOverflow > 0 ? `${projectOverflow} more projects` : "More projects"}
                  </p>
                  <p className="text-sm text-ink-400">Explore the full showcase</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400">
                    View all projects
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}
