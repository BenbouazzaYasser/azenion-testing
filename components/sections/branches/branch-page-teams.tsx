import { Users } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { TeamCard, type TeamCardTeam } from "@/components/sections/teams/team-card";
import { serverT } from "@/lib/translation/server";

interface BranchPageTeamsProps {
  teams: TeamCardTeam[];
}

export async function BranchPageTeams({ teams }: BranchPageTeamsProps) {
  if (teams.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-teams-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {await serverT("branches.ecosystemEyebrow")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-teams-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("branches.branchTeamsTitle")}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>

        {teams.length >= 6 ? (
          <Reveal delay={120}>
            <p className="mt-6 text-center text-xs text-ink-600">
              <Users size={12} className="mr-1 inline" />
              {await serverT("branches.showingTeamsSelection")}
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
