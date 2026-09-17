import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, Bookmark, FolderKanban, Users, UsersRound } from "lucide-react";

interface ProfileStatsProps {
  branch: { name: string; slug: string } | null;
  teamsCount: number;
  projectsCount: number;
  activitiesCount: number;
  savedPostsCount: number;
  cardClass: string;
}

function formatCount(value: number) {
  return value > 0 ? String(value) : "\u2014";
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
  savedPostsCount,
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
    {
      label: "Saved",
      value: formatCount(savedPostsCount),
      icon: Bookmark,
      href: "/profile/saved-posts",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isLastOdd = cards.length % 2 === 1 && index === cards.length - 1;
        const content = (
          <div className={`${cardClass} h-full transition-all duration-300 ease-premium hover:border-accent-400/40`}>
            <Icon className="h-4 w-4 text-accent-400" />
            <p className="mt-3 truncate text-lg font-semibold text-ink-50">
              {card.value}
            </p>
            <p className="text-xs text-ink-400">{card.label}</p>
          </div>
        );

        return (
          <div key={card.label} className={`h-full${isLastOdd ? " col-span-2 sm:col-span-1" : ""}`}>
            {card.href ? (
              <Link
                href={card.href}
                className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded-2xl"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
