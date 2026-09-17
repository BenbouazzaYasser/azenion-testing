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
          <div className="lg:sticky lg:top-32">
            <p className="text-xs font-medium uppercase tracking-normal text-ink-500">
              {await serverT("home.whyEyebrow")}
            </p>

            <h2
              id="why-azenion-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
            >
              {await serverT("home.whyTitle")}
              {await serverT("home.whyTitleAccent")}
            </h2>

            <p className="mt-5 max-w-xl text-[1.02rem] leading-8 text-ink-400">
              {await serverT("home.whyParaA")}
            </p>

            <p className="mt-4 max-w-xl text-[1.02rem] leading-8 text-ink-400">
              {await serverT("home.whyParaB")}
            </p>

            <DashboardButton size="lg" className="mt-8" label={await serverT("home.joinMovement")} />
          </div>

          {/* Focus areas — hairline-divided rows, not cards. The page keeps
              one bold moment (hero + featured band); this section stays quiet. */}
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {(await Promise.all(FOCUS_CARDS.map(async (card) => {
              const Icon = card.icon;
              return (
                <div key={card.titleKey} className="border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={1.75} className="shrink-0 text-accent-300" aria-hidden />
                    <h3 className="text-[1.05rem] font-semibold text-ink-50">
                      {await serverT(card.titleKey)}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-400">
                    {await serverT(card.descKey)}
                  </p>
                </div>
              );
            })))}
          </div>
        </div>
      </div>

      {/* Value pillars — one quiet row under a single divider. */}
      <div className="mx-auto mt-16 max-w-[1320px] px-5 sm:px-8 lg:mt-20 lg:px-12">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-4">
          {(await Promise.all(PILLARS.map(async (pillar) => (
            <div key={pillar.titleKey}>
              <dt className="text-sm font-semibold text-ink-50">{await serverT(pillar.titleKey)}</dt>
              <dd className="mt-1.5 text-xs leading-relaxed text-ink-500">
                {await serverT(pillar.descKey)}
              </dd>
            </div>
          ))))}
        </dl>
      </div>
    </section>
  );
}
