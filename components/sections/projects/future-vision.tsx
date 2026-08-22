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
            Projects are the heartbeat of{" "}
            <span className="text-accent-400">the Limitless Network.</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-[1.02rem] leading-8 text-ink-400">
            <p>
              We envision a future where every Azenion member contributes to a
              project they are passionate about — where ideas flow freely across
              campuses, disciplines, and time zones, finding the right people to
              bring them to life.
            </p>
            <p>
              Projects will become the primary vehicle for learning, creating,
              and building real careers. A conversation in a channel becomes a
              prototype. A prototype becomes a startup. A startup becomes
              something the world remembers.
            </p>
            <p>
              That future does not build itself. It takes builders — people
              willing to start before they are ready, to collaborate before they
              are certain, and to ship before they are perfect.
            </p>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {[
              { stat: "Ideas", desc: "become projects" },
              { stat: "Projects", desc: "become products" },
              { stat: "Builders", desc: "become founders" },
            ].map((item) => (
              <div
                key={item.stat}
                className="group rounded-2xl border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
              >
                <p className="text-lg font-semibold text-accent-400">{item.stat}</p>
                <p className="mt-1 text-sm text-ink-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mx-auto mt-12 max-w-2xl text-balance text-[1.3rem] font-medium leading-relaxed text-ink-200 sm:text-[1.45rem]">
            The Limitless Network is waiting for your next idea.
            <br />
            <span className="text-accent-400">Start building.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
