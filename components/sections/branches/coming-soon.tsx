import { Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { CONTACT } from "@/data/contact";
import { serverT } from "@/lib/translation/server";

const ghostSlots = ["branches.yourCampus", "branches.yourCity", "branches.yourNetwork"] as const;

export function ComingSoonTeaser() {
  return (
    <section
      id="coming-soon"
      aria-labelledby="coming-soon-heading"
      className="relative px-6 pb-20 sm:pb-28"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-border-strong bg-surface p-10 text-center sm:p-16">
            <div
              aria-hidden="true"
              className="animate-pulse-glow pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(40,40,255)]/15 blur-[110px]"
            />

            <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center">
              <Badge className="mb-6 inline-flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                {serverT("branches.moreComing")}
              </Badge>

              <h2 id="coming-soon-heading" className="text-2xl font-semibold text-ink-50 sm:text-3xl">
                {serverT("branches.networkStarted")}
              </h2>
              <p className="mt-4 text-sm text-ink-400 sm:text-base">
                {serverT("branches.networkStartedSub")}
              </p>

              <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                {ghostSlots.map((slot) => (
                  <div
                    key={slot}
                    className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-ink-600 transition-colors duration-700 ease-premium hover:border-[rgba(40,40,255,0.35)] hover:text-ink-400"
                  >
                    <span className="text-2xl font-light" aria-hidden="true">
                      ∞
                    </span>
                    <span className="text-xs uppercase tracking-[0.15em]">{serverT(slot)}</span>
                  </div>
                ))}
              </div>

              <a
                href={`${CONTACT.emailHref}?subject=Starting%20a%20new%20Azenion%20branch`}
                className="mt-8 text-sm font-medium text-accent-500 underline-offset-4 transition-colors duration-500 ease-premium hover:text-accent-300 hover:underline"
              >
                {serverT("branches.nominate")} →
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
