import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";

export async function Hero() {
  return (
    <section className="relative pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      {/* On mobile the artwork sits behind the copy as ambient atmosphere
          rather than a competing second column — the brief for "intentionally
          designed" mobile, not a resized desktop layout. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden opacity-40 lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(40,40,255,0.20),transparent_36%),radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.08),transparent_28%)]" />
        <InfinityHeroArt idPrefix="hero-mobile" className="h-full w-full scale-[1.35]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void-950/40 to-void-950" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-16 px-5 pb-24 pt-6 sm:px-8 sm:pt-10 lg:pb-32 lg:px-12 lg:pt-10">
        {/* Left — copy. One staggered entrance on load; nothing else on the
            page animates without a user action. */}
        <div className="relative z-10 max-w-xl">
          <div className="animate-fade-in-up motion-reduce:opacity-100">
            <Badge className="inline-flex">
              <Globe2 size={13} className="text-accent-400" />
              {await serverT("home.heroBadge")}
            </Badge>
          </div>

          <h1
            className="mt-6 animate-fade-in-up text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 opacity-0 motion-reduce:opacity-100 max-sm:animate-none max-sm:opacity-100 [animation-delay:90ms] sm:text-[3.4rem] lg:text-[3.75rem]"
          >
            {await serverT("home.heroTitleA")}
            <br />
            {await serverT("home.heroTitleB")}<span className="text-accent">{await serverT("home.heroImpact")}</span>
          </h1>

          <p className="mt-6 animate-fade-in-up text-balance text-[1.05rem] leading-relaxed text-ink-400 opacity-0 motion-reduce:opacity-100 max-sm:animate-none max-sm:opacity-100 [animation-delay:180ms]">
            {await serverT("home.heroSubA")}
            <br className="hidden sm:block" />
            {await serverT("home.heroSubB")}
          </p>

          <div className="mt-8 flex animate-fade-in-up flex-col gap-3 opacity-0 motion-reduce:opacity-100 max-sm:animate-none max-sm:opacity-100 [animation-delay:270ms] sm:flex-row sm:items-center">
            <DashboardButton size="lg" label={await serverT("home.heroJoinCta")} />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/projects">{await serverT("home.exploreProjects")}</Link>
            </Button>
          </div>

          <div className="animate-fade-in-up motion-reduce:opacity-100 max-sm:animate-none max-sm:opacity-100 [animation-delay:360ms]">
            <div className="relative mt-6 rounded-2xl card-surface-soft p-5">
              <p className="text-sm font-medium text-ink-50">{await serverT("home.heroQuickOverview")}</p>
              <p className="mt-2 text-sm leading-6 text-ink-400">
                {await serverT("home.heroOverviewSub")}
              </p>
            </div>
          </div>

          <div className="mt-12 hidden items-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-normal text-ink-600">
              {await serverT("home.heroScroll")}
            </span>
          </div>
        </div>

        {/* Right — signature artwork (desktop / tablet).
            Lifted out of flow so it reads as one composition: the Infinity
            bleeds in from behind the copy instead of occupying a separate
            right column. The text (z-10) layers above the symbol. */}
        {/* Enormous, off-screen-deduct envelope: the artwork feels like a
            gigantic environmental object with no perceptible start or end.
            The inner "art" is anchored to the same resting spot the symbol
            already had; only the wrapper's occupancy is expanded. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block overflow-visible">
          <div className="absolute end-[2%] top-[0%] aspect-[800/520] w-[44rem] translate-y-[10%]">
            <InfinityHeroArt className="absolute inset-0 h-full w-full opacity-95" />
          </div>
        </div>
      </div>
    </section>
  );
}
