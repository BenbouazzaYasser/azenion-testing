import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serverT } from "@/lib/translation/server";

export function LabsHero() {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
      <Reveal delay={0}>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
          {serverT("academy.labsEyebrow")}
        </span>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {serverT("academy.labs")}
        </h1>
      </Reveal>

      <Reveal delay={140}>
        <p className="mt-6 text-balance text-lg font-medium text-accent-300 sm:text-xl">
          {serverT("academy.labsTagline")}
        </p>
      </Reveal>

      <Reveal delay={180}>
        <div className="mt-6 flex justify-center">
          <Badge className="border-accent-400/30 bg-accent/[0.08] text-accent-300">
            {serverT("academy.labsComingSoon")}
          </Badge>
        </div>
      </Reveal>

      <Reveal delay={220}>
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {serverT("academy.labsDesc")}
        </p>
      </Reveal>

      <Reveal delay={280}>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button variant="secondary" size="lg" disabled>
            {serverT("academy.labsNotify")}
          </Button>
          <p className="text-xs text-ink-600">
            {serverT("academy.labsNotifySub")}
          </p>
        </div>
      </Reveal>
    </PageHero>
  );
}
