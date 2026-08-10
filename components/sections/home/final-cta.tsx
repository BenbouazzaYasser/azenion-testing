import { Rocket } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function FinalCta() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-32" aria-labelledby="final-cta-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border-strong card-surface px-8 py-16 text-center shadow-card backdrop-blur-xl sm:px-16 sm:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(71,71,255,0.18),transparent_60%)]"
            />
            <div className="relative mx-auto max-w-3xl">
              <span className="inline-flex items-center justify-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Rocket size={13} />
                Join the network
              </span>
              <h2
                id="final-cta-heading"
                className="mt-6 text-balance text-[2.25rem] font-semibold leading-[1.05] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
              >
                Ready to build something{" "}
                <span className="text-accent-400">limitless?</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-ink-400">
                Your community, your teams, your projects are waiting. Join Azenion and start
                building alongside people who push you further.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <DashboardButton label="Join Now" />
                <Button asChild variant="secondary" size="lg">
                  <a href="/teams">
                    Explore the Platform
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
