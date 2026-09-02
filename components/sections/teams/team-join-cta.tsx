import { Reveal } from "@/components/ui/reveal";
import { TeamJoinButton, type TeamRequestStatus } from "./team-join-button";
import { serverT } from "@/lib/translation/server";

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
            {isMember ? serverT("teams.ctaMember") : isRequestPending ? serverT("teams.ctaPending") : serverT("teams.ctaReady")}
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {isMember
              ? serverT("teams.ctaMemberSub")
              : isRequestPending
                ? serverT("teams.ctaPendingSub")
                : serverT("teams.ctaReadySub")}
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
