import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

export function AcademyLandingHero() {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
      <Reveal delay={0}>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
          {serverT("academy.badge")}
        </span>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {serverT("academy.landingH1")} <span className="text-accent-400">{serverT("academy.landingAccent")}</span>
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {serverT("academy.landingSub")}
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
            {serverT("academy.exploreAcademy")}
          </span>
        </div>
      </Reveal>
    </PageHero>
  );
}
