import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(40,40,255,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(109,109,255,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_55%)]" />
        <div className="absolute inset-x-0 top-0 h-[70vh] bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
      </div>

      {/* On mobile the artwork sits behind the copy as ambient atmosphere
          rather than a competing second column — the brief for "intentionally
          designed" mobile, not a resized desktop layout. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-40 lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(40,40,255,0.20),transparent_36%),radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.08),transparent_28%)]" />
        <InfinityHeroArt idPrefix="hero-mobile" className="h-full w-full scale-[1.35]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void-950/40 to-void-950" />
      </div>

      <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-16 px-5 pb-28 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:px-12 lg:pb-40 lg:pt-16">
        {/* Left — copy */}
        <div className="relative z-10 max-w-xl">
          <Reveal delay={0}>
            <Badge className="inline-flex">
              <Globe2 size={13} className="text-accent-400" />
              The Limitless Network
            </Badge>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[3.75rem]">
              Infinite minds.
              <br />
              Limitless <span className="text-accent-400">impact.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 text-balance text-[1.05rem] leading-relaxed text-ink-400">
              The Limitless Network brings ambitious minds together through learning,
              collaboration and innovation.
              <br className="hidden sm:block" />
              Together, we build. Together, we elevate.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/join">
                Join the Network
                <ArrowUpRight size={16} />
              </Link>
            </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link href="/projects">Explore Projects</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-6 rounded-2xl border border-border/80 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <p className="text-sm font-medium text-ink-50">Quick overview</p>
              <p className="mt-2 text-sm leading-6 text-ink-400">
                Azenion connects learners, builders, and innovators in one global
                community to create opportunities and grow together.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 hidden items-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
              Scroll to explore
            </span>
          </div>
        </div>

        {/* Right — signature artwork (desktop / tablet) */}
        <div className="relative -mx-8 hidden aspect-[800/520] w-[calc(100%+4rem)] sm:block lg:mx-0 lg:w-full lg:pr-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(109,109,255,0.15),transparent_42%),radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.08),transparent_35%)]" />
          <div className="absolute inset-x-10 top-10 h-32 rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-void-950 via-void-950/20 to-transparent" />
          <InfinityHeroArt className="absolute inset-0 h-full w-full scale-[1.12] opacity-95" />
        </div>
      </div>
    </section>
  );
}
