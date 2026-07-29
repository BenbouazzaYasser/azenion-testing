import Link from "next/link";
import { Plus } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export function CreateTeam() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="create-team-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="pointer-events-none absolute left-1/2 top-[30%] h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[22%] top-[18%] h-[3px] w-[3px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[78%] top-[22%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[25%] top-[72%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[72%] top-[78%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[50%] top-[12%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[88%] top-[40%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[10%] top-[55%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[65%] top-[88%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="group relative overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-10 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] sm:p-14 lg:p-16">
            <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[rgb(40,40,255)]/10 blur-[100px]" />

            <div className="relative">
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] text-accent-400">
                  <Plus size={24} strokeWidth={2} />
                </div>

                <h2
                  id="create-team-heading"
                  className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
                >
                  Start Your Own Team
                </h2>

                <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-ink-400">
                  Anyone can create a team around an idea, project, startup,
                  competition, research initiative, or shared passion. If you
                  can dream it, you can build it — with the right people beside
                  you.
                </p>

                <div className="mt-10">
                  <Button size="lg" asChild>
                    <Link href="/teams/create">
                      Create Team
                      <Plus size={16} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
