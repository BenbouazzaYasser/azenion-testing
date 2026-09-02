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

import { Reveal } from "@/components/ui/reveal";
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

export function Ecosystem() {
  return (
    <section
      className="relative py-20 sm:py-24 lg:py-28"
      aria-labelledby="ecosystem-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(40,40,255,0.06),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              {serverT("home.ecosystemEyebrow")}
            </span>
            <h2
              id="ecosystem-heading"
              className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem]"
            >
              {serverT("home.ecosystemTitle")}<span className="text-accent-400">{serverT("home.ecosystemAccent")}</span>
            </h2>
            <p className="mt-5 text-balance text-[1.02rem] leading-relaxed text-ink-400">
              {serverT("home.ecosystemSub")}
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.href} delay={i * 60} className="h-full">
                <Link
                  href={item.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] card-surface-soft p-7 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
                >
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.07),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-300 ease-premium group-hover:-translate-y-1 group-hover:shadow-glow-sm">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>

                  <h3 className="relative mt-5 text-lg font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-300">
                    {serverT(item.titleKey)}
                  </h3>
                  <p className="relative mt-2.5 flex-1 text-sm leading-relaxed text-ink-400">
                    {serverT(item.descKey)}
                  </p>

                  <span className="relative mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-80 transition-all duration-300 group-hover:gap-2.5 group-hover:opacity-100">
                    {serverT(item.ctaKey)}
                    <ArrowUpRight size={14} />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
