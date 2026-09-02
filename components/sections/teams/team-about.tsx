import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

interface TeamAboutProps {
  description: string | null;
}

export function TeamAbout({ description }: TeamAboutProps) {
  if (!description) return null;

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="team-about-heading">
      <BackgroundInfinity variant="teams" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="relative mx-auto max-w-[920px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {serverT("teams.aboutEyebrow")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-about-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {serverT("teams.aboutTitle")}
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-6 space-y-5 text-[1.02rem] leading-8 text-ink-400">
            <p>{description}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
