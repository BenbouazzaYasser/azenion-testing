import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";

export function TeamsHero() {
  return (
    <PageHero variant="teams" slug="teams" atmosphere={false}>
      <Reveal delay={0}>
        <h1
          id="teams-hero-heading"
          className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          Build Together.{" "}
          <span className="text-accent-400">Grow Together.</span>
        </h1>
      </Reveal>

      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          The greatest ideas are never built alone. Azenion helps ambitious
          people find the right collaborators — across campuses, disciplines,
          and borders — so no vision stays unrealised.
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong/[0.08] p-1.5">
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
