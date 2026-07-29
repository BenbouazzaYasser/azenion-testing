import { Reveal } from "@/components/ui/reveal";
import type { Team } from "@/data/teams";

interface TeamValuesProps {
  team: Team;
}

export function TeamValues({ team }: TeamValuesProps) {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="team-values-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[40%] top-[15%] h-56 w-56 -translate-x-1/2 rounded-full bg-accent/8 blur-[120px]" />
      <div className="pointer-events-none absolute right-[20%] bottom-[20%] h-40 w-40 rounded-full bg-accent-400/8 blur-[100px]" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Culture
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-values-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Team values
          </h2>
          <p className="mt-4 max-w-lg text-[1.02rem] leading-7 text-ink-400">
            The principles that guide how we build, collaborate, and grow together.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {team.values.map((value, i) => (
            <Reveal key={value.id} delay={i * 60}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] sm:p-7">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-sm font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                    {value.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                    {value.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
