import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

export function LiveSessionsHero() {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
      <Reveal delay={0}>
        <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {serverT("academy.liveSessionsH1")}{" "}
          <span className="text-accent-400">{serverT("academy.liveSessionsH1Accent")}</span>
        </h1>
      </Reveal>

      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {serverT("academy.liveSessionsSub")}
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
            {serverT("academy.scrollToExplore")}
          </span>
        </div>
      </Reveal>
    </PageHero>
  );
}
