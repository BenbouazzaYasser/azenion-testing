import { Users, Plus } from "lucide-react";

import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import type { Project } from "@/data/projects";

interface ProjectDetailHeroProps {
  project: Project;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-accent-400",
  Planning: "bg-blue-400",
  Concept: "bg-amber-400",
};

export function ProjectDetailHero({ project }: ProjectDetailHeroProps) {
  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <BackgroundInfinity variant="projects" />

      <div className="relative mx-auto max-w-[920px] px-5 pb-28 pt-16 text-center sm:px-8 sm:pt-20 lg:pb-36 lg:pt-24">
        <Reveal delay={0}>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            <span
              className={`flex h-2 w-2 rounded-full ${
                STATUS_COLORS[project.status] || "bg-accent-400"
              }`}
            />
            {project.status}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
            {project.title}
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
            {project.tagline}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Users className="h-4 w-4 text-accent-400" aria-hidden="true" />
              {project.memberCount} Contributor{project.memberCount !== 1 ? "s" : ""}
            </div>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 flex justify-center">
            <Button size="lg" asChild>
              <a href={project.joinCtaHref}>
                {project.joinCtaLabel}
                <Plus size={16} />
              </a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-14 hidden items-center justify-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong/[0.08] p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
              Scroll to explore
            </span>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-1/2 h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </section>
  );
}
