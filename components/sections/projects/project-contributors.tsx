import { Users } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import type { Project } from "@/data/projects";

interface ProjectContributorsProps {
  project: Project;
}

export function ProjectContributors({ project }: ProjectContributorsProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-contributors-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            People
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-contributors-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Current contributors
          </h2>
        </Reveal>

        {project.contributors.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {project.contributors.map((contributor, i) => (
              <Reveal key={contributor.id} delay={i * 80}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-xl font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
                      {contributor.name.charAt(0)}
                    </div>

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {contributor.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-ink-400">
                      <Users size={13} className="shrink-0" aria-hidden="true" />
                      <span>{contributor.role}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={160}>
            <div className="mt-10 rounded-2xl card-surface p-10 text-center shadow-card backdrop-blur-xl">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-accent-300">
                  <Users className="h-6 w-6 text-accent-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-200">No contributors yet</p>
                  <p className="mt-1 text-sm text-ink-600">Be the first to join this project.</p>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
