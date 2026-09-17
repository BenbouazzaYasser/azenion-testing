import Link from "next/link";
import {
  Landmark,
  Users,
  Rocket,
  GraduationCap,
  Newspaper,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const ECOSYSTEM: { href: string; icon: typeof Landmark; titleKey: DictKey; descKey: DictKey; ctaKey: DictKey }[] = [
  {
    href: "/branches",
    icon: Landmark,
    titleKey: "nav.branches",
    descKey: "home.ecosystemBranchesDesc",
    ctaKey: "home.ecosystemBranchesCta",
  },
  {
    href: "/teams",
    icon: Users,
    titleKey: "nav.teams",
    descKey: "home.ecosystemTeamsDesc",
    ctaKey: "home.ecosystemTeamsCta",
  },
  {
    href: "/projects",
    icon: Rocket,
    titleKey: "nav.projects",
    descKey: "home.ecosystemProjectsDesc",
    ctaKey: "home.ecosystemProjectsCta",
  },
  {
    href: "/academy",
    icon: GraduationCap,
    titleKey: "nav.academy",
    descKey: "home.ecosystemAcademyDesc",
    ctaKey: "home.ecosystemAcademyCta",
  },
  {
    href: "/feed",
    icon: Newspaper,
    titleKey: "nav.feed",
    descKey: "home.ecosystemFeedDesc",
    ctaKey: "home.ecosystemFeedCta",
  },
  {
    href: "/showcase",
    icon: Sparkles,
    titleKey: "nav.showcase",
    descKey: "home.ecosystemShowcaseDesc",
    ctaKey: "home.ecosystemShowcaseCta",
  },
];

export async function Ecosystem() {
  return (
    <section
      className="relative py-20 sm:py-24 lg:py-28"
      aria-labelledby="ecosystem-heading"
    >
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-normal text-ink-500">
            {await serverT("home.ecosystemEyebrow")}
          </p>
          <h2
            id="ecosystem-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem]"
          >
            {await serverT("home.ecosystemTitle")}{await serverT("home.ecosystemAccent")}
          </h2>
          <p className="mt-5 text-balance text-[1.02rem] leading-relaxed text-ink-400">
            {await serverT("home.ecosystemSub")}
          </p>
        </div>

        {/* Directory rows — the six product areas, hairline-divided. */}
        <div className="mt-12 grid gap-x-12 sm:grid-cols-2">
          {(await Promise.all(ECOSYSTEM.map(async (item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-4 border-t border-border py-6"
              >
                <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-300" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink-50 transition-colors duration-200 group-hover:text-accent-300">
                    {await serverT(item.titleKey)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-400">
                    {await serverT(item.descKey)}
                  </p>
                </div>
                <ArrowUpRight
                  size={16}
                  className="mt-1 shrink-0 text-ink-600 transition-colors duration-200 group-hover:text-accent-400"
                  aria-hidden
                />
              </Link>
            );
          })))}
        </div>
      </div>
    </section>
  );
}
