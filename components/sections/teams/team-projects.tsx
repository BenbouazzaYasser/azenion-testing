import { ArrowUpRight, FolderKanban } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import type { Team } from "@/data/teams";

interface TeamProjectsProps {
  team: Team;
}

export function TeamProjects({ team }: TeamProjectsProps) {
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
          <h2
            id="team-projects-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Current projects
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {team.projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 80}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <FolderKanban size={17} strokeWidth={1.75} className="relative" />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <h3 className="text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {project.title}
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-accent-300">
                      {project.status}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                    {project.description}
                  </p>

                  <div className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    View details
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
