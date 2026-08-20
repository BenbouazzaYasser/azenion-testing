"use client";

import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { ProjectCard, type ProjectCardProject } from "./project-card";

interface MyProjectsProps {
  projects: ProjectCardProject[];
}

export function MyProjects({ projects }: MyProjectsProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban size={32} />}
        title="No projects yet"
        description="You haven't joined or created any projects yet."
        eyebrow="Your workspace"
        actionHref="/projects"
        actionLabel="Explore Projects"
      />
    );
  }

  return (
    <section className="relative py-14 sm:py-16" aria-labelledby="my-projects-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Your Projects
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="my-projects-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            My Projects
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
