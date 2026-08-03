import { Users, Building2, FolderKanban, MessageSquare, Calendar } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { formatDate } from "@/lib/date";

interface BranchStatsProps {
  memberCount: number;
  teamsCount: number;
  projectsCount: number;
  postsCount: number;
  eventsCount: number;
  createdAt: string | null;
}

export function BranchPageStats({ memberCount, teamsCount, projectsCount, postsCount, eventsCount, createdAt }: BranchStatsProps) {
  const stats = [
    { icon: Users, label: "Members", value: memberCount },
    { icon: Building2, label: "Teams", value: teamsCount },
    { icon: FolderKanban, label: "Projects", value: projectsCount },
    { icon: MessageSquare, label: "Posts", value: postsCount },
    { icon: Calendar, label: "Upcoming Events", value: eventsCount },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-stats-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Overview
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-stats-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Branch Hub
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={120 + i * 60}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm">
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

        {createdAt ? (
          <Reveal delay={380}>
            <p className="mt-6 text-center text-xs text-ink-600">
              This branch has been active since {formatDate(createdAt)}.
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
