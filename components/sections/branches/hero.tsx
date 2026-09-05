import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Button } from "@/components/ui/button";
import { InfinityHeroArt } from "@/components/graphics/infinity-hero-art";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

interface BranchesHeroProps {
  branchCount: number;
  memberCount: number;
}

export async function BranchesHero({ branchCount, memberCount }: BranchesHeroProps) {
  return (
    <section
      aria-labelledby="branches-hero-heading"
      className="relative flex min-h-[70vh] w-full items-center justify-center px-6 pb-14 pt-[120px] sm:pt-[136px] lg:pt-[152px]"
    >
      <BackgroundInfinity variant="branches" />
      {/* Cosmic backdrop */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="animate-drift-slow opacity-40">
          <InfinityHeroArt variant="branches" className="h-[560px] w-[560px] sm:h-[720px] sm:w-[720px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <Badge className="mb-6 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {await serverT("branches.heroBadge")}
          </Badge>
        </Reveal>

        <Reveal delay={100}>
          <h1
            id="branches-hero-heading"
            className="text-balance text-4xl font-semibold tracking-tight text-ink-50 sm:text-6xl"
          >
            {await serverT("branches.heroLine1")}
            <br className="hidden sm:block" /> {await serverT("branches.heroLine2")}
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 max-w-xl text-balance text-base text-ink-400 sm:text-lg">
            {await serverT("branches.heroSub")}
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <Link href="#branches">
                {await serverT("branches.exploreBranches")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="#coming-soon">{await serverT("branches.requestBranch")}</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-ink-600">
            {branchCount} {await serverT("branches.activeBranches")} · {memberCount}+ {await serverT("branches.membersAndCounting")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
