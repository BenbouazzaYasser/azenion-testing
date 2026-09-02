import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { serverT } from "@/lib/translation/server";

interface AcademyHeroProps {
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
  badge?: string;
}

export function AcademyHero({ eyebrow, title, accent, subtitle, badge }: AcademyHeroProps) {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
      <Reveal delay={0}>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
          {eyebrow}
        </span>
      </Reveal>

      <Reveal delay={80}>
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {title} <span className="text-accent-400">{accent}</span>
        </h1>
      </Reveal>

      {badge ? (
        <Reveal delay={140}>
          <div className="mt-6 flex justify-center">
            <Badge className="border-accent-400/30 bg-accent/[0.08] text-accent-300">{badge}</Badge>
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={badge ? 200 : 140}>
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {subtitle}
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
            {serverT("academy.scrollToExplore")}
          </span>
        </div>
      </Reveal>
    </PageHero>
  );
}
