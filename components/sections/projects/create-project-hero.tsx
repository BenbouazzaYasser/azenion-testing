import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";

export function CreateProjectHero() {
  return (
    <PageHero variant="projects" slug="create-project">
      <Reveal delay={0}>
        <h1
          id="create-project-hero-heading"
          className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          Create a Project
        </h1>
      </Reveal>

      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          Turn your idea into reality by creating a project and finding
          collaborators within Azenion.
        </p>
      </Reveal>
    </PageHero>
  );
}
