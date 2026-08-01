import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { AmbientBg } from "@/components/graphics/ambient-bg";
import { Badge } from "@/components/ui/badge";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Button } from "@/components/ui/button";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";
import { Reveal } from "@/components/ui/reveal";

interface BranchesHeroProps {
  branchCount: number;
  memberCount: number;
}

export function BranchesHero({ branchCount, memberCount }: BranchesHeroProps) {
  return (
    <section
      aria-labelledby="branches-hero-heading"
      className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden px-6 pb-24 pt-[184px] sm:pt-[216px] lg:pt-[232px]"
    >
      <AmbientBg />
      <BackgroundInfinity variant="branches" />
      {/* Cosmic backdrop */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="animate-drift-slow opacity-40">
          <InfinityHeroArt variant="branches" className="h-[560px] w-[560px] sm:h-[720px] sm:w-[720px]" />
        </div>
      </div>

      {/* Ambient glow + particles */}
      <div
        aria-hidden="true"
        className="animate-pulse-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(40,40,255)]/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="animate-float-y pointer-events-none absolute right-[14%] top-[24%] h-2 w-2 rounded-full bg-[rgb(40,40,255)] shadow-[0_0_20px_6px_rgba(40,40,255,0.5)]"
      />
      <div
        aria-hidden="true"
        className="animate-twinkle pointer-events-none absolute left-[18%] top-[38%] h-1.5 w-1.5 rounded-full bg-white/70"
      />
      <div
        aria-hidden="true"
        style={{ animationDelay: "1.4s" }}
        className="animate-twinkle pointer-events-none absolute bottom-[26%] right-[26%] h-1 w-1 rounded-full bg-white/60"
      />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <Badge className="mb-6 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            The Limitless Network — Branches
          </Badge>
        </Reveal>

        <Reveal delay={100}>
          <h1
            id="branches-hero-heading"
            className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl"
          >
            Every branch is its own hub.
            <br className="hidden sm:block" /> Together, they&apos;re infinite.
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 max-w-xl text-balance text-base text-white/60 sm:text-lg">
            Azenion runs on campus branches — local communities of builders, engineers, and
            innovators who bring the Limitless Network to life where they study. Find yours below.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <Link href="#branches">
                Explore branches
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="#coming-soon">Request a Branch</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="mt-8 text-xs uppercase tracking-[0.2em] text-white/35">
            {branchCount} active branches · {memberCount}+ members and counting
          </p>
        </Reveal>
      </div>
    </section>
  );
}
