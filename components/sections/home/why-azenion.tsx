import {
  Network,
  HeartHandshake,
  Lightbulb,
  Rocket,
  GraduationCap,
  Users,
  Layers,
  TrendingUp,
} from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const PILLARS: { icon: typeof Lightbulb; titleKey: DictKey; descKey: DictKey }[] = [
  {
    icon: GraduationCap,
    titleKey: "home.pillarLearn",
    descKey: "home.pillarLearnDesc",
  },
  {
    icon: Users,
    titleKey: "home.pillarCollaborate",
    descKey: "home.pillarCollaborateDesc",
  },
  {
    icon: Lightbulb,
    titleKey: "home.pillarInnovate",
    descKey: "home.pillarInnovateDesc",
  },
  {
    icon: TrendingUp,
    titleKey: "home.pillarElevate",
    descKey: "home.pillarElevateDesc",
  },
];

const FOCUS_CARDS: { icon: typeof Network; titleKey: DictKey; descKey: DictKey }[] = [
  {
    icon: Network,
    titleKey: "home.focusNetwork",
    descKey: "home.focusNetworkDesc",
  },
  {
    icon: HeartHandshake,
    titleKey: "home.focusCollaboration",
    descKey: "home.focusCollaborationDesc",
  },
  {
    icon: Rocket,
    titleKey: "home.focusStudents",
    descKey: "home.focusStudentsDesc",
  },
  {
    icon: Layers,
    titleKey: "home.focusJourney",
    descKey: "home.focusJourneyDesc",
  },
];

export async function WhyAzenion() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="why-azenion-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* Copy */}
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Network size={13} />
                {await serverT("home.whyEyebrow")}
              </span>

              <h2
                id="why-azenion-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                {await serverT("home.whyTitle")}
                <span className="text-accent-400">{await serverT("home.whyTitleAccent")}</span>
              </h2>

              <p className="mt-5 max-w-xl text-[1.02rem] leading-8 text-ink-400">
                {await serverT("home.whyParaA")}
              </p>

              <p className="mt-4 max-w-xl text-[1.02rem] leading-8 text-ink-400">
                {await serverT("home.whyParaB")}
              </p>

              <DashboardButton size="lg" className="mt-8" label={await serverT("home.joinMovement")} />
            </div>
          </Reveal>

          {/* Focus cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {await Promise.all(FOCUS_CARDS.map(async (card, i) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.titleKey} delay={i * 80} className="h-full">
                  <div className="group relative h-full overflow-hidden rounded-[1.6rem] card-surface-soft p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:card-surface hover:shadow-glow-sm sm:p-7">
                    <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.07),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glow-sm">
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <h3 className="relative mt-5 text-[1.05rem] font-semibold text-ink-50">
                      {await serverT(card.titleKey)}
                    </h3>
                    <p className="relative mt-2.5 text-sm leading-relaxed text-ink-400">
                      {await serverT(card.descKey)}
                    </p>
                  </div>
                </Reveal>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Value pillars */}
      <div className="mx-auto mt-[0.875rem] max-w-[1320px] px-5 sm:px-8 lg:mt-[1.5rem] lg:px-12">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {await Promise.all(PILLARS.map(async (pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.titleKey}
                  className="group relative overflow-hidden rounded-[1.4rem] card-surface-soft p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:card-surface hover:shadow-glow-sm"
                >
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.07),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="relative flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-glow-sm">
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink-50">{await serverT(pillar.titleKey)}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                        {await serverT(pillar.descKey)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
