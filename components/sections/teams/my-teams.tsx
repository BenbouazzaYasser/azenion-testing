"use client";

import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { TeamCard, type TeamCardTeam } from "./team-card";

interface MyTeamsProps {
  teams: TeamCardTeam[];
}

export function MyTeams({ teams }: MyTeamsProps) {
  if (teams.length === 0) {
    return (
      <section className="relative py-16 sm:py-20" aria-labelledby="my-teams-heading">
        <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
          <Reveal>
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-700/50 bg-white/[0.03]">
                <Users className="h-7 w-7 text-ink-500" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">
                  You&apos;re not part of any team yet.
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  Create a team and start building with others.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm" className="mt-2">
                <Link href="/teams/create">
                  <Plus size={15} />
                  Create a team
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 sm:py-20" aria-labelledby="my-teams-heading">
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
