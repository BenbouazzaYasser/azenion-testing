import Link from "next/link";
import { Globe2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function Hero() {
  return (
    <section className="relative pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      {/* On mobile the artwork sits behind the copy as ambient atmosphere
          rather than a competing second column — the brief for "intentionally
          designed" mobile, not a resized desktop layout. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-40 lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(40,40,255,0.20),transparent_36%),radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.08),transparent_28%)]" />
        <InfinityHeroArt idPrefix="hero-mobile" className="h-full w-full scale-[1.35]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void-950/40 to-void-950" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-16 px-5 pb-24 pt-6 sm:px-8 sm:pt-10 lg:-translate-x-[60px] lg:pb-32 lg:pl-2 lg:pr-12 lg:pt-10">
        {/* Left — copy */}
        <div className="relative z-10 max-w-xl lg:-translate-x-5">
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <DashboardButton size="lg" label="Join the Network" />
              <Button variant="secondary" size="lg" asChild>
                <Link href="/projects">Explore Projects</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="relative mt-6">
              <div
                aria-hidden
                className="absolute -inset-x-4 -inset-y-6 rounded-[2rem] bg-accent-400/[0.14] blur-[60px]"
              />
              <div className="relative rounded-2xl border border-border/50 bg-surface/70 p-4 shadow-[0_24px_50px_-20px_rgba(40,40,255,0.35)] backdrop-blur-xl">
                <p className="text-sm font-medium text-ink-50">Quick overview</p>
                <p className="mt-2 text-sm leading-6 text-ink-400">
                  Azenion connects learners, builders, and innovators in one global
                  community to create opportunities and grow together.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 hidden items-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
              Scroll to explore
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
        <div className="pointer-events-none absolute -inset-[20%] hidden sm:block">
          <div className="absolute right-[-16%] top-[7%] aspect-[800/520] w-[50rem] -translate-x-[44.5%] translate-y-[25%]">
            <InfinityHeroArt className="absolute inset-0 h-full w-full scale-[1.05] opacity-95" />
          </div>
        </div>
      </div>
    </section>
  );
}
