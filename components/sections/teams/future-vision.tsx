import { Reveal } from "@/components/ui/reveal";

export function FutureVision() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-36" aria-labelledby="future-vision-heading">
      <div className="relative mx-auto max-w-[920px] px-5 text-center sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            The future
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="future-vision-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            Teams are the foundation of <span className="text-accent-400">everything we build.</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-[1.02rem] leading-8 text-ink-400">
            <p>
              We envision a future where every Azenion member belongs to a team —
              where cross-campus squads form around shared interests, compete in
              hackathons, launch real startups, and contribute to open-source
              projects that outlive their university years.
            </p>
            <p>
              Teams will connect branches, fuel events, and become the primary
              vehicle for collaboration across the entire network. A project born
              in one city will find contributors in another. A conversation in
              a channel will grow into a company.
            </p>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {[
              { stat: "Branches", desc: "connected through teams" },
              { stat: "Projects", desc: "powered by collaboration" },
              { stat: "Members", desc: "building together worldwide" },
            ].map((item) => (
              <div
                key={item.stat}
                className="group rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
              >
                <p className="text-lg font-semibold text-accent-400">{item.stat}</p>
                <p className="mt-1 text-sm text-ink-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mx-auto mt-12 max-w-2xl text-balance text-[1.3rem] font-medium leading-relaxed text-ink-200 sm:text-[1.45rem]">
            That future starts with you.
            <br />
            <span className="text-accent-400">Find your team. Build something great.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
