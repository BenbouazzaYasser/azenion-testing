import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const STATS: { statKey: DictKey; descKey: DictKey }[] = [
  { statKey: "projects.futureStatIdeas", descKey: "projects.futureStatIdeasDesc" },
  { statKey: "projects.futureStatProjects", descKey: "projects.futureStatProjectsDesc" },
  { statKey: "projects.futureStatBuilders", descKey: "projects.futureStatBuildersDesc" },
];

export async function FutureVision() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-36" aria-labelledby="future-vision-heading">
      <div className="relative mx-auto max-w-[920px] px-5 text-center sm:px-8 lg:px-12">
        
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {await serverT("projects.futureEyebrow")}
          </div>
        

        
          <h2
            id="future-vision-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {await serverT("projects.futureTitle")}{" "}
            {await serverT("projects.futureTitleAccent")}
          </h2>
        

        
          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-[1.02rem] leading-8 text-ink-400">
            <p>{await serverT("projects.futureP1")}</p>
            <p>{await serverT("projects.futureP2")}</p>
            <p>{await serverT("projects.futureP3")}</p>
          </div>
        

        
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {(await Promise.all(STATS.map(async (item) => (
              <div
                key={item.statKey}
                className="group rounded-2xl card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40"
              >
                <p className="text-lg font-semibold text-accent-400">{await serverT(item.statKey)}</p>
                <p className="mt-1 text-sm text-ink-400">{await serverT(item.descKey)}</p>
              </div>
            ))))}
          </div>
        

        
          <p className="mx-auto mt-12 max-w-2xl text-balance text-[1.3rem] font-medium leading-relaxed text-ink-200 sm:text-[1.45rem]">
            {await serverT("projects.futureCta")}
            <br />
            {await serverT("projects.futureCtaAccent")}
          </p>
        
      </div>
    </section>
  );
}
