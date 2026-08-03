import { Reveal } from "@/components/ui/reveal";
import { TeamJoinButton, type TeamRequestStatus } from "./team-join-button";

interface TeamJoinCtaProps {
  teamId: string;
  teamName: string;
  teamSlug: string;
  isMember: boolean;
  isOwner: boolean;
  requestStatus?: TeamRequestStatus;
}

export function TeamJoinCta({ teamId, teamName, teamSlug, isMember, isOwner, requestStatus = null }: TeamJoinCtaProps) {
  const isRequestPending = requestStatus === "PENDING";

  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="team-join-heading">
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="team-join-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {isMember ? "Part of the team?" : isRequestPending ? "Request in review" : "Ready to build?"}
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {isMember
              ? "You're already a member of this team."
              : isRequestPending
                ? "Your request to join is waiting for the team owner to review it. We'll let you know once it's accepted."
                : "If you share the vision and want to contribute — request to join the team and start building together."}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex justify-center">
            <TeamJoinButton
              teamId={teamId}
              teamName={teamName}
              teamSlug={teamSlug}
              isMember={isMember}
              isOwner={isOwner}
              requestStatus={requestStatus}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
