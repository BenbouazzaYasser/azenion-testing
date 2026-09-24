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

const ECOSYSTEM_GRID = "group flex min-h-[220px] flex-col justify-between border-b border-border py-7 transition-colors duration-150 sm:pr-8 lg:min-h-[240px] lg:py-8";

async function EcosystemLink({ item }: { item: (typeof ECOSYSTEM)[number] }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={ECOSYSTEM_GRID}>
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent-300" aria-hidden />
          <div>
            <h3 className="text-xl font-semibold text-ink-50 transition-colors duration-150 group-hover:text-accent-200">
              {await serverT(item.titleKey)}
            </h3>
            <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-ink-300">
              {await serverT(item.descKey)}
            </p>
          </div>
        </div>
        <ArrowUpRight
          size={18}
          className="shrink-0 text-ink-500 transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-300"
          aria-hidden
        />
      </div>
      <span className="mt-8 w-fit text-xs font-medium text-accent-300 underline decoration-accent-300/0 underline-offset-4 transition-[text-decoration-color] duration-200 group-hover:decoration-accent-300/70">{await serverT(item.ctaKey)}</span>
    </Link>
  );
}

export async function Ecosystem() {
  const primary = ECOSYSTEM.slice(0, 3);
  const secondary = ECOSYSTEM.slice(3);

  return (
    <section className="relative overflow-hidden bg-void-950 py-24 sm:py-28 lg:py-36" aria-labelledby="ecosystem-heading">
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-20">
          <h2 id="ecosystem-heading" className="max-w-3xl text-balance font-display text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.035em] text-ink-50 sm:text-[3.5rem] lg:text-[4.5rem]">
            {await serverT("home.ecosystemTitle")}
            <span className="text-accent-300">{await serverT("home.ecosystemAccent")}</span>
          </h2>
          <p className="max-w-xl text-balance text-[1.05rem] leading-8 text-ink-300 lg:justify-self-end lg:pb-1">
            {await serverT("home.ecosystemSub")}
          </p>
        </div>

        <div className="mt-16 grid border-t border-border lg:mt-24 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-1">
            {await Promise.all(primary.map(async (item) => <EcosystemLink key={item.href} item={item} />))}
          </div>
          <div className="border-t border-border sm:grid sm:grid-cols-2 lg:border-s lg:border-t-0">
            {await Promise.all(secondary.map(async (item) => <EcosystemLink key={item.href} item={item} />))}
          </div>
        </div>
      </div>
    </section>
  );
}
