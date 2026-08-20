import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { TeamCard, type TeamCardTeam } from "@/components/sections/teams/team-card";

interface TrendingTeamsProps {
  teams: TeamCardTeam[];
}

export function TrendingTeams({ teams }: TrendingTeamsProps) {
  const preview = teams.slice(0, 3);

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="trending-teams-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Users size={13} />
                Trending Teams
              </span>
              <h2
                id="trending-teams-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                Small crews, <span className="text-accent-400">big momentum.</span>
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-400">
                The most active teams building products, startups and research together.
              </p>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/teams">
                Explore Teams
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </Reveal>

        {preview.length > 0 ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {preview.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-14 flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border-strong bg-white/[0.01] px-8 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08] text-accent-300">
                <Users size={20} />
              </span>
              <p className="text-lg font-semibold text-ink-50">No teams yet</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-400">
                Teams are forming across the network. Start one or join the first
                teams as they appear.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
