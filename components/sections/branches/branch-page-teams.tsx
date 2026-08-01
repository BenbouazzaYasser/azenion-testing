import { Users } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { TeamCard, type TeamCardTeam } from "@/components/sections/teams/team-card";

interface BranchPageTeamsProps {
  teams: TeamCardTeam[];
}

export function BranchPageTeams({ teams }: BranchPageTeamsProps) {
  if (teams.length === 0) return null;

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="branch-teams-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Ecosystem
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-teams-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Teams in this branch
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>

        {teams.length >= 6 ? (
          <Reveal delay={120}>
            <p className="mt-8 text-center text-xs text-ink-600">
              <Users size={12} className="mr-1 inline" />
              Showing a selection — explore all teams from the Teams page.
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
