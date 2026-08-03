import { Plus } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import type { Project } from "@/data/projects";

interface ProjectJoinCtaProps {
  project: Project;
}

export function ProjectJoinCta({ project }: ProjectJoinCtaProps) {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="project-join-heading">
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
          <div className="mt-8 flex justify-center">
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
