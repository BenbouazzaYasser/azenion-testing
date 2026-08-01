"use client";

import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { ProjectCard, type ProjectCardProject } from "@/components/sections/projects/project-card";

interface TeamProjectsProps {
  projects: ProjectCardProject[];
  canManage: boolean;
  teamId: string;
  teamSlug: string;
}

export function TeamProjects({ projects, canManage, teamId, teamSlug }: TeamProjectsProps) {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="team-projects-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[30%] top-[20%] h-60 w-60 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[15%] top-[40%] h-44 w-44 rounded-full bg-accent-400/8 blur-[100px]" />

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
            {canManage ? (
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
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        ) : (
          <Reveal delay={120}>
            <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
              <FolderKanban className="h-8 w-8 text-ink-600" />
              <p className="max-w-xs text-sm text-ink-400">
                No projects yet. {canManage ? "Create the first project for this team." : "Check back later."}
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
