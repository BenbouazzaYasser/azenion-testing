import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { RequestSessionDialog } from "./request-session-dialog";
import type { BranchOption } from "./request-session-dialog";

const TOPICS = ["Workshops", "Talks", "Deep Dives", "Q&A Sessions"];

export function RequestSessionSection({
  branches,
  isAuthenticated,
}: {
  branches: BranchOption[];
  isAuthenticated: boolean;
}) {
  return (
    <section
      id="request-session"
      className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24"
      aria-labelledby="request-session-heading"
    >
      <div className="mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Academy · Request
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="request-session-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            Request a <span className="text-accent-400">Session.</span>
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            Missing a session you need? Tell us what you want to learn and the
            Academy team will bring it to life — hosted online or at your branch.
          </p>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {TOPICS.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium tracking-wide text-ink-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10">
            {isAuthenticated ? (
              <RequestSessionDialog branches={branches} />
            ) : (
              <Button variant="secondary" size="lg" asChild>
                <Link href="/login">Sign in to request a session</Link>
              </Button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
