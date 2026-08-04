import { Reveal } from "@/components/ui/reveal";

export function Vision() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-36" aria-labelledby="vision-heading">
      <div className="relative mx-auto max-w-[920px] px-5 text-center sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Our vision
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="vision-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            A global ecosystem where{" "}
            <span className="text-accent-400">ideas become reality.</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-[1.02rem] leading-8 text-ink-400">
            <p>
              We envision a world where no ambitious person ever has to build
              alone. Where ideas find their teams before they fade, projects
              find their audience before they stall, and talent finds its
              path before it is wasted.
            </p>
            <p>
              A world where a student in one country can launch something
              with a teammate from another, where a late-night conversation
              becomes a startup, where learning is lifelong and collaboration
              knows no borders.
            </p>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {[
              { stat: "Ideas", desc: "become projects" },
              { stat: "Projects", desc: "become startups" },
              { stat: "Strangers", desc: "become teammates" },
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
            That is the world we are building.
            <br />
            <span className="text-accent-400">One connection at a time.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
