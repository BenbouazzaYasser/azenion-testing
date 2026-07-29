import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundAtmosphere } from "@/components/graphics/background-atmosphere";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Reveal } from "@/components/ui/reveal";
import type { Team } from "@/data/teams";

interface TeamAboutProps {
  team: Team;
}

export function TeamAbout({ team }: TeamAboutProps) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28 lg:py-32" aria-labelledby="team-about-heading">
      <AmbientBg preset="detail" />
      <BackgroundInfinity variant="teams" />
      <BackgroundAtmosphere />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="relative mx-auto max-w-[920px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            About
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-about-heading"
            className="mt-8 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Who we are
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8 space-y-5 text-[1.02rem] leading-8 text-ink-400">
            <p>{team.about}</p>
            {team.aboutAdditional.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
