import { CalendarClock } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { SessionCard } from "./session-card";
import { SessionFormDialog } from "./session-form-dialog";
import type {
  LiveSessionWithManage,
  ManageableHostOption,
} from "@/lib/validations/live-session.schema";

interface UpcomingSessionsProps {
  sessions: LiveSessionWithManage[];
  canCreate: boolean;
  hostOptions: ManageableHostOption[];
}

export function UpcomingSessions({ sessions, canCreate, hostOptions }: UpcomingSessionsProps) {
  const hasSessions = sessions.length > 0;

  return (
    <section
      id="upcoming-sessions"
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="upcoming-sessions-heading"
    >
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              <CalendarClock size={12} />
              Academy · Upcoming
            </span>
            <h2
              id="upcoming-sessions-heading"
              className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
            >
              Upcoming <span className="text-accent-400">Sessions.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
              Join live workshops, talks and deep dives — online and in person,
              hosted by teams and branches across Azenion.
            </p>
            {canCreate ? (
              <div className="mt-8 flex justify-center">
                <SessionFormDialog mode="create" hostOptions={hostOptions} />
              </div>
            ) : null}
          </div>
        </Reveal>

        {hasSessions ? (
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {sessions.map((session, i) => (
              <Reveal key={session.id} delay={(i % 2) * 100} className="h-full">
                <SessionCard session={session} hostOptions={hostOptions} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={120}>
            <div className="relative mt-14 flex flex-col items-center overflow-hidden rounded-2xl border border-border-strong/[0.08] card-surface-soft px-8 py-20 text-center shadow-card backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                <CalendarClock size={32} />
              </div>
              <h3 className="relative mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl">
                No live sessions scheduled.
              </h3>
              <p className="relative mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                New sessions are on the way. In the meantime, request the session
                you want and we will bring it to life.
              </p>
              <div className="relative mt-8">
                <Button asChild>
                  <a href="#request-session">Request a Session</a>
                </Button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
