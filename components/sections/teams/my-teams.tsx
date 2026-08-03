"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { TeamCard, type TeamCardTeam } from "./team-card";

interface MyTeamsProps {
  teams: TeamCardTeam[];
}

export function MyTeams({ teams }: MyTeamsProps) {
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="No teams yet"
        description="You're not part of any teams yet."
        eyebrow="Your workspace"
        actionHref="/teams"
        actionLabel="Explore Teams"
      />
    );
  }

  return (
    <section className="relative py-14 sm:py-16" aria-labelledby="my-teams-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Your Teams
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="my-teams-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            My Teams
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
