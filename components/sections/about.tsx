import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="about-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-5xl rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-8 shadow-card backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Sparkles size={13} />
                About Azenion
              </div>

              <h2
                id="about-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                We are building a place where ambition can become movement.
              </h2>

              <p className="mt-5 max-w-2xl text-[1.02rem] leading-8 text-ink-400">
                Azenion exists to give exceptional people a stronger way to grow.
                We connect learning, collaboration, and opportunity in one network
                so talent is not left waiting for chance to find it.
              </p>

              <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-ink-400">
                Our mission is simple: make it easier for ambitious minds to build
                meaningful work, shape lasting communities, and contribute to a
                future that is larger than any one individual.
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-[1.4rem] border border-border/80 bg-void-950/70 p-6 sm:p-7">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-600">
                  Why join
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-ink-400">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    Find a community that values depth, initiative, and long-term growth.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    Access opportunities shaped by people who are building with intention.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    Help define the next era of global connection and collective progress.
                  </li>
                </ul>
              </div>

              <Button size="lg" className="mt-8 w-full justify-center sm:w-auto" asChild>
                <Link href="/join">
                  Join the movement
                  <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
