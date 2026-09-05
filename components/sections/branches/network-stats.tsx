import { Building2, CalendarClock, Users } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";

interface NetworkStatsProps {
  branchCount: number;
  memberCount: number;
  upcomingEvents: number;
}

export async function NetworkStats({ branchCount, memberCount, upcomingEvents }: NetworkStatsProps) {
  const stats = [
    {
      icon: Building2,
      value: `${branchCount}`,
      label: await serverT("branches.statActiveBranches"),
    },
    {
      icon: Users,
      value: `${memberCount}+`,
      label: await serverT("branches.statCombinedMembers"),
    },
    {
      icon: CalendarClock,
      value: `${upcomingEvents}`,
      label: await serverT("branches.statUpcomingEvents"),
    },
  ] as const;
  return (
    <section aria-label={await serverT("branches.networkGlance")} className="relative px-6 pb-16 sm:pb-24">
      <Reveal>
        <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y divide-border-strong card-surface rounded-[2rem] backdrop-blur-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 px-8 py-8 text-center"
            >
              <stat.icon className="h-5 w-5 text-[rgb(40,40,255)]" aria-hidden="true" />
              <span className="text-3xl font-semibold text-ink-50">{stat.value}</span>
              <span className="text-xs uppercase tracking-[0.15em] text-ink-500">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
