import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, Bookmark, FolderKanban, Users, UsersRound } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const content = (
          <div className={`${cardClass} h-full transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:shadow-glow-sm`}>
            <Icon className="h-4 w-4 text-accent-400" />
            <p className="mt-3 truncate text-lg font-semibold text-ink-50">
              {card.value}
            </p>
            <p className="text-xs text-ink-400">{card.label}</p>
          </div>
        );

        return (
          <Reveal key={card.label} delay={index * 60} className="h-full">
            {card.href ? (
              <Link
                href={card.href}
                className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded-[1.5rem]"
              >
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
