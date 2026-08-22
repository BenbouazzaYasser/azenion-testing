"use client";

import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { ProjectCard, type ProjectCardProject } from "@/components/sections/projects/project-card";

interface TeamProjectsProps {
  projects: ProjectCardProject[];
  canCreateProjects: boolean;
  teamId: string;
  teamSlug: string;
}

export function TeamProjects({ projects, canCreateProjects, teamId, teamSlug }: TeamProjectsProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="team-projects-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Building
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex items-center justify-between">
            <h2
              id="team-projects-heading"
              className="text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              Current projects
            </h2>
            {canCreateProjects ? (
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/projects/create?team=${teamId}`}>
                  <Plus size={14} />
                  New Project
                </Link>
              </Button>
            ) : null}
          </div>
        </Reveal>

        {projects.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        ) : (
          <Reveal delay={120}>
            <div className="mt-10 flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300">
                <FolderKanban className="h-6 w-6 text-accent-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-200">No projects yet</p>
                <p className="mt-1 max-w-xs text-sm text-ink-600">
                  {canCreateProjects ? "Create the first project for this team." : "Check back later."}
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
