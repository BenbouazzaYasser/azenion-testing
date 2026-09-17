"use client";

import { BarChart3, Building2, FolderKanban, Users } from "lucide-react";

import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";

interface Stat {
  id: string;
  labelKey: DictKey;
  value: number;
  icon: typeof Users;
}

function StatItem({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  const { t } = useTranslation();

  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink-50 sm:text-5xl">
          {stat.value.toLocaleString()}
        </span>
        <Icon size={18} strokeWidth={1.75} className="text-accent-300" aria-hidden />
      </div>
      <p className="mt-2 text-sm font-medium uppercase tracking-normal text-ink-500">
        {t(stat.labelKey)}
      </p>
    </div>
  );
}

interface CommunityNumbersProps {
  members: number;
  teams: number;
  projects: number;
  branches: number;
}

export function CommunityNumbers({ members, teams, projects, branches }: CommunityNumbersProps) {
  const { t } = useTranslation();

  const stats: Stat[] = [
    { id: "members", labelKey: "home.statMembers", value: members, icon: Users },
    { id: "teams", labelKey: "home.statTeams", value: teams, icon: FolderKanban },
    { id: "projects", labelKey: "home.statProjects", value: projects, icon: BarChart3 },
    { id: "branches", labelKey: "home.statBranches", value: branches, icon: Building2 },
  ];

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="community-numbers-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-normal text-ink-500">
            {t("home.numbersEyebrow")}
          </p>
          <h2
            id="community-numbers-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
          >
            {t("home.numbersTitle")}{t("home.numbersAccent")}
          </h2>
        </div>

        {/* The figures themselves are the section — display numerals on a
            shared hairline, no cards, no count-up theatrics. */}
        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatItem key={stat.id} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
