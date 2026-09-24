import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";

export async function Hero() {
  return (
    <section className="border-b border-border bg-void-950 pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-16 px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-24 lg:px-12 lg:pb-32">
        <div className="max-w-2xl">
          <h1
            className="animate-fade-in-up text-balance font-display text-[3.1rem] font-semibold leading-[0.96] tracking-[-0.045em] text-ink-50 opacity-0 sm:text-[4.25rem] lg:text-[5.25rem]"
            style={{ animationDelay: "50ms" }}
          >
            {await serverT("home.heroTitleA")}
            <br />
            {await serverT("home.heroTitleB")}
            <span className="text-accent-300">{await serverT("home.heroImpact")}</span>
          </h1>

          <p
            className="mt-7 max-w-[54ch] animate-fade-in-up text-[1.05rem] leading-8 text-ink-300 opacity-0"
            style={{ animationDelay: "150ms" }}
          >
            {await serverT("home.heroSubA")}
            <br className="hidden sm:block" />
            {await serverT("home.heroSubB")}
          </p>

          <div
            className="mt-9 flex animate-fade-in-up flex-col gap-3 opacity-0 sm:flex-row sm:items-center"
            style={{ animationDelay: "250ms" }}
          >
            <DashboardButton size="lg" label={await serverT("home.heroJoinCta")} />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/projects">{await serverT("home.exploreProjects")}</Link>
            </Button>
          </div>

          <div
            className="mt-10 animate-fade-in-up border-y border-border py-5 opacity-0"
            style={{ animationDelay: "350ms" }}
          >
            <p className="text-sm font-medium text-ink-50">{await serverT("home.heroQuickOverview")}</p>
            <p className="mt-2 max-w-[54ch] text-sm leading-6 text-ink-300">
              {await serverT("home.heroOverviewSub")}
            </p>
          </div>

          <div className="mt-10 hidden items-center gap-3 border-l border-accent-400 pl-3 sm:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              {await serverT("home.heroScroll")}
            </span>
          </div>
        </div>

        <div
          className="relative hidden min-h-[440px] animate-fade-in-up border-l border-border opacity-0 lg:flex lg:items-center"
          style={{ animationDelay: "200ms" }}
        >
          <div className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-600">
            A / INF
          </div>
          <InfinityHeroArt className="h-full w-full max-w-[38rem] opacity-90" />
        </div>
      </div>
    </section>
  );
}
