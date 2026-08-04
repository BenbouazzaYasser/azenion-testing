import { Users, FolderKanban, Calendar, UserPlus } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { formatDate } from "@/lib/date";
import { TeamCategoryBadge } from "./team-category-badge";

interface TeamStatsProps {
  memberCount: number;
  projectsCount: number;
  openRolesCount: number;
  createdAt: string | null;
  categories: { id: string; name: string; slug: string }[];
}

export function TeamStats({ memberCount, projectsCount, openRolesCount, createdAt, categories }: TeamStatsProps) {
  const stats = [
    { icon: Users, label: "Members", value: memberCount },
    { icon: FolderKanban, label: "Projects", value: projectsCount },
    { icon: UserPlus, label: "Open Roles", value: openRolesCount },
    { icon: Calendar, label: "Created", value: createdAt ? formatDate(createdAt) : "-" },
  ];

  const visibleCats = categories.slice(0, 3);
  const catOverflow = categories.length - visibleCats.length;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="team-stats-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              Overview
            </div>
            {categories.map((cat) => (
              <TeamCategoryBadge key={cat.id} name={cat.name} />
            ))}
            {catOverflow > 0 ? (
              <span className="inline-flex rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                +{catOverflow}
              </span>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="team-stats-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Team Stats
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={120 + i * 60}>
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
                      <stat.icon size={18} className="text-accent-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-ink-50">{stat.value}</p>
                      <p className="text-sm text-ink-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
