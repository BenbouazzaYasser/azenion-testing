import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

export function CreateProjectHero() {
  return (
    <PageHero variant="projects" slug="create-project" atmosphere={false}>
      <Reveal delay={0}>
        <h1
          id="create-project-hero-heading"
          className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          {serverT("projects.createTitle")}
        </h1>
      </Reveal>

      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          {serverT("projects.createSub")}
        </p>
      </Reveal>
    </PageHero>
  );
}
