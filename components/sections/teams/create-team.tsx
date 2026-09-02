import Link from "next/link";
import { Plus } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { serverT } from "@/lib/translation/server";

export function CreateTeam() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="create-team-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="group relative overflow-hidden rounded-[2rem] card-surface p-10 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm sm:p-14 lg:p-16">
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
                  {serverT("teams.ctaTitle")}
                </h2>

                <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-ink-400">
                  {serverT("teams.ctaSub")}
                </p>

                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link href="/teams/create">
                      {serverT("teams.ctaButton")}
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
