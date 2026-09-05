import { Users, Building2, FolderKanban, MessageSquare, Calendar } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { formatDate } from "@/lib/date";
import { serverT } from "@/lib/translation/server";

interface BranchStatsProps {
  memberCount: number;
  teamsCount: number;
  projectsCount: number;
  postsCount: number;
  eventsCount: number;
  createdAt: string | null;
}

export async function BranchPageStats({ memberCount, teamsCount, projectsCount, postsCount, eventsCount, createdAt }: BranchStatsProps) {
  const stats = [
    { icon: Users, label: await serverT("branches.statMembers"), value: memberCount },
    { icon: Building2, label: await serverT("branches.statTeams"), value: teamsCount },
    { icon: FolderKanban, label: await serverT("branches.statProjects"), value: projectsCount },
    { icon: MessageSquare, label: await serverT("branches.statPosts"), value: postsCount },
    { icon: Calendar, label: await serverT("branches.statUpcomingEvents"), value: eventsCount },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-stats-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {await serverT("branches.statsOverview")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-stats-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("branches.branchHub")}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={120 + i * 60}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
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
              {await serverT("branches.activeSince")} {formatDate(createdAt)}.
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
