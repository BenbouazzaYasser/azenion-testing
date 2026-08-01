import { Reveal } from "@/components/ui/reveal";
import { TeamJoinButton } from "./team-join-button";

interface TeamJoinCtaProps {
  teamId: string;
  teamSlug: string;
  isMember: boolean;
  isOwner: boolean;
}

export function TeamJoinCta({ teamId, teamSlug, isMember, isOwner }: TeamJoinCtaProps) {
  return (
    <section className="relative overflow-hidden py-28 sm:py-32 lg:py-40" aria-labelledby="team-join-heading">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(40,40,255,0.18),transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/8 blur-[140px]" />

      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="team-join-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {isMember ? "Part of the team?" : "Ready to build?"}
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {isMember
              ? "You're already a member of this team."
              : "If you share the vision and want to contribute — join the team and start building together."}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex justify-center">
            <TeamJoinButton
              teamId={teamId}
              teamSlug={teamSlug}
              isMember={isMember}
              isOwner={isOwner}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
