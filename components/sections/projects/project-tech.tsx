import { Code2 } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import type { Project } from "@/data/projects";

interface ProjectTechProps {
  project: Project;
}

export function ProjectTech({ project }: ProjectTechProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-tech-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Stack
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-tech-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Technologies
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {project.technologies.map((tech, i) => (
            <Reveal key={tech} delay={i * 80}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col items-center p-8 text-center sm:p-9">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
                    <Code2 size={22} strokeWidth={1.75} />
                  </div>

                  <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                    {tech}
                  </h3>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
