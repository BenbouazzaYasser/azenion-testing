import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";

export function CreateTeamHero() {
  return (
    <PageHero variant="teams" slug="create-team" atmosphere={false}>
      <Reveal delay={0}>
        <h1
          id="create-team-hero-heading"
          className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          Create Your Team
        </h1>
      </Reveal>

      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          Build a team around an idea, a project, a competition, or a shared
          passion. Teams are the foundation of collaboration within Azenion.
        </p>
      </Reveal>
    </PageHero>
  );
}
