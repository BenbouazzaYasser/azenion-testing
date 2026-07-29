import { Building2, CalendarClock, Users } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { activeBranches, totalMemberCount, totalUpcomingEvents } from "@/data/branches";

const stats = [
  {
    icon: Building2,
    value: `${activeBranches.length}`,
    label: "Active branches",
  },
  {
    icon: Users,
    value: `${totalMemberCount}+`,
    label: "Combined members",
  },
  {
    icon: CalendarClock,
    value: `${totalUpcomingEvents}`,
    label: "Upcoming events",
  },
] as const;

export function NetworkStats() {
  return (
    <section aria-label="Network at a glance" className="relative px-6 pb-20 sm:pb-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[130px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[30%] top-[20%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[70%] top-[30%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[40%] top-[70%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
      </div>

      <Reveal>
        <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 px-8 py-8 text-center"
            >
              <stat.icon className="h-5 w-5 text-[rgb(40,40,255)]" aria-hidden="true" />
              <span className="text-3xl font-semibold text-white">{stat.value}</span>
              <span className="text-xs uppercase tracking-[0.15em] text-white/45">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
