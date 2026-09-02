import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const STATS: { statKey: DictKey; descKey: DictKey }[] = [
  { statKey: "projects.futureStatIdeas", descKey: "projects.futureStatIdeasDesc" },
  { statKey: "projects.futureStatProjects", descKey: "projects.futureStatProjectsDesc" },
  { statKey: "projects.futureStatBuilders", descKey: "projects.futureStatBuildersDesc" },
];

export function FutureVision() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-36" aria-labelledby="future-vision-heading">
      <div className="relative mx-auto max-w-[920px] px-5 text-center sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {serverT("projects.futureEyebrow")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="future-vision-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {serverT("projects.futureTitle")}{" "}
            <span className="text-accent-400">{serverT("projects.futureTitleAccent")}</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-[1.02rem] leading-8 text-ink-400">
            <p>{serverT("projects.futureP1")}</p>
            <p>{serverT("projects.futureP2")}</p>
            <p>{serverT("projects.futureP3")}</p>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {STATS.map((item) => (
              <div
                key={item.statKey}
                className="group rounded-2xl card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
              >
                <p className="text-lg font-semibold text-accent-400">{serverT(item.statKey)}</p>
                <p className="mt-1 text-sm text-ink-400">{serverT(item.descKey)}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mx-auto mt-12 max-w-2xl text-balance text-[1.3rem] font-medium leading-relaxed text-ink-200 sm:text-[1.45rem]">
            {serverT("projects.futureCta")}
            <br />
            <span className="text-accent-400">{serverT("projects.futureCtaAccent")}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
