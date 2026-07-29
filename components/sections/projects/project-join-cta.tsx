import { Plus } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import type { Project } from "@/data/projects";

interface ProjectJoinCtaProps {
  project: Project;
}

export function ProjectJoinCta({ project }: ProjectJoinCtaProps) {
  return (
    <section className="relative overflow-hidden py-28 sm:py-32 lg:py-40" aria-labelledby="project-join-heading">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(40,40,255,0.18),transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/8 blur-[140px]" />

      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="project-join-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            Want to{" "}
            <span className="text-accent-400">contribute?</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            This project needs people like you. Whether you are a developer,
            designer, or strategist — there is a way to make an impact.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <a href={project.joinCtaHref}>
                {project.joinCtaLabel}
                <Plus size={16} />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
