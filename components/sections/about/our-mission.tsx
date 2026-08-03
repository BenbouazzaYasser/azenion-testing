import { MISSION_CARDS } from "@/data/about";
import { Reveal } from "@/components/ui/reveal";

export function OurMission() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="mission-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="mission-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Our mission
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            Three pillars that guide everything we build.
          </p>
        </Reveal>

        <div className="relative mt-12 grid gap-6 sm:grid-cols-3">
          {MISSION_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delay={i * 80} className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.08),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative p-8 sm:p-9">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <Icon size={20} strokeWidth={1.75} className="relative" />
                    </div>

                    <h3 className="mt-6 text-[1.15rem] font-semibold text-ink-50">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-400">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
