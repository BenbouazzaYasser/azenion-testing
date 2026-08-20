import { CheckCircle2, Circle, LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import type { Project } from "@/data/projects";

interface ProjectRoadmapProps {
  project: Project;
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  Completed: CheckCircle2,
  ["In Progress"]: Circle,
  Upcoming: Circle,
};

const STATUS_COLORS: Record<string, string> = {
  Completed: "text-accent-400",
  ["In Progress"]: "text-accent-400",
  Upcoming: "text-ink-600",
};

export function ProjectRoadmap({ project }: ProjectRoadmapProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-roadmap-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Roadmap
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-roadmap-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Project roadmap
          </h2>
        </Reveal>

        <div className="mt-10 space-y-4">
          {project.roadmap.map((item, i) => {
            const Icon = STATUS_ICONS[item.status] || Circle;
            return (
              <Reveal key={item.id} delay={i * 80}>
                <div className="group relative overflow-hidden rounded-2xl border border-border-strong card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 ${STATUS_COLORS[item.status] || "text-ink-600"}`}>
                        <Icon
                          size={20}
                          strokeWidth={item.status === "Completed" ? 2.5 : 1.5}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                            {item.phase}
                          </h3>
                          <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-accent-300">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
