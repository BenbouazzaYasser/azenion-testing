import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { projects } from "@/data/projects";

const STATUS_COLORS: Record<string, string> = {
  Active: "border-accent/20 bg-accent/[0.06] text-accent-300",
  Planning: "border-blue-400/20 bg-blue-400/[0.06] text-blue-300",
  Concept: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
};

export function ProjectShowcase() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="showcase-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[20%] top-[20%] h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[20%] bottom-[20%] h-48 w-48 rounded-full bg-accent-400/8 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[12%] top-[15%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[78%] top-[18%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[18%] top-[78%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[75%] top-[72%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[48%] top-[8%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[90%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[8%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[62%] top-[90%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Featured
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="showcase-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Featured projects
          </h2>
          <p className="mt-4 max-w-xl text-[1.02rem] leading-7 text-ink-400">
            Discover active projects seeking collaborators across the Limitless Network.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 80}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {project.title}
                    </h3>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
                        STATUS_COLORS[project.status] || ""
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                    {project.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm text-ink-400">
                    <Users size={14} className="shrink-0 text-accent-400" aria-hidden="true" />
                    <span>{project.memberCount} Member{project.memberCount !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-white/55 transition-colors duration-300 group-hover:border-accent-400/30 group-hover:text-accent-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button asChild variant="primary" size="sm">
                      <Link href={`/projects/${project.slug}`}>
                        View Project
                        <ArrowUpRight size={14} />
                      </Link>
                    </Button>
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
