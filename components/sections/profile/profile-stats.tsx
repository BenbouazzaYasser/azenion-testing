import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, FolderKanban, Users, UsersRound } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

interface ProfileStatsProps {
  branch: { name: string; slug: string } | null;
  teamsCount: number;
  projectsCount: number;
  activitiesCount: number;
  cardClass: string;
}

function formatCount(value: number) {
  return value > 0 ? String(value) : "—";
}

interface StatCard {
  label: string;
  value: string;
  icon: LucideIcon;
  href?: string;
}

export function ProfileStats({
  branch,
  teamsCount,
  projectsCount,
  activitiesCount,
  cardClass,
}: ProfileStatsProps) {
  const cards: StatCard[] = [
    {
      label: "Branch",
      value: branch?.name ?? "—",
      icon: Users,
      href: branch ? "/profile/my-branches" : undefined,
    },
    {
      label: "Teams",
      value: formatCount(teamsCount),
      icon: UsersRound,
      href: "/profile/my-teams",
    },
    {
      label: "Projects",
      value: formatCount(projectsCount),
      icon: FolderKanban,
      href: "/profile/my-projects",
    },
    {
      label: "Activities",
      value: formatCount(activitiesCount),
      icon: Activity,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const content = (
          <div className={`${cardClass} h-full`}>
            <Icon className="h-4 w-4 text-accent-400" />
            <p className="mt-3 truncate text-lg font-semibold text-ink-50">
              {card.value}
            </p>
            <p className="text-xs text-ink-400">{card.label}</p>
          </div>
        );

        return (
          <Reveal key={card.label} delay={index * 80} className="h-full">
            {card.href ? (
              <Link href={card.href} className="block h-full transition-opacity hover:opacity-90">
                {content}
              </Link>
            ) : (
              content
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
