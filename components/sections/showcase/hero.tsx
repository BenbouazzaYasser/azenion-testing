import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";

export function ShowcaseHero() {
  return (
    <PageHero variant="showcase" slug="showcase" atmosphere={false}>
      <Reveal delay={0}>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
          Showcase
        </div>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          Every Great Journey{" "}
          <span className="text-accent-400">Begins Somewhere.</span>
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          Today this space is quiet. But soon it will become a collection of
          incredible projects, unforgettable events, ambitious teams, and
          inspiring success stories built by the Azenion community.
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
            Scroll to explore
          </span>
        </div>
      </Reveal>
    </PageHero>
  );
}
