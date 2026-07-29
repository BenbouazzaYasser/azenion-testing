import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const TEAM_TAGS = ["Leadership", "Web Development", "Community", "Design"] as const;

export function FeaturedTeam() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="featured-team-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[25%] top-[15%] h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[20%] top-[50%] h-48 w-48 rounded-full bg-accent-400/10 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[18%] top-[10%] h-[3px] w-[3px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[82%] top-[15%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[12%] top-[80%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[78%] top-[82%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[48%] top-[5%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[92%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[5%] top-[40%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[62%] top-[90%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="featured-team-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Featured team
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            Meet the team behind Azenion — the people building the platform,
            growing the community, and creating opportunities for you.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-14 block">
          <div className="group relative overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
            <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="absolute -right-6 -top-6 select-none text-[8rem] font-bold leading-none text-white/[0.02] sm:text-[10rem]">
              01
            </div>

            <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:p-12">
              <div className="flex flex-col">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[rgba(40,40,255,0.35)] bg-[rgb(40,40,255)]/10 p-3">
                    <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden="true">
                      <title>Infinity symbol</title>
                      <path d="M96 256C96 170 192 170 256 256C320 342 416 342 416 256C416 170 320 170 256 256C192 342 96 342 96 256Z" fill="none" stroke="#2828ff" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <Badge>Active · Recruiting</Badge>
                  </div>
                </div>

                <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                  Azenion Core Team
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
                  The founding team behind Azenion, dedicated to building the
                  platform, growing the community, and creating opportunities
                  for ambitious students.
                </p>

                <div className="mt-7 flex items-center gap-6 border-t border-white/10 pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[rgb(40,40,255)]" aria-hidden="true" />
                    <span className="text-sm text-white/70">3 Members</span>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  {TEAM_TAGS.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-white/55 transition-colors duration-300 group-hover:border-accent-400/30 group-hover:text-accent-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8">
                  <Button asChild variant="primary">
                    <Link href="/teams/azenion-core-team">
                      View Team
                      <ArrowUpRight size={16} />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/45">
                    About this team
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
                    <p>
                      The Core Team operates across all Azenion branches and
                      initiatives. From shaping the platform roadmap to
                      designing community experiences, this team ensures the
                      network keeps growing in the right direction.
                    </p>
                    <p>
                      They work closely with branch leads, organise network-wide
                      events, and maintain the infrastructure that makes
                      Azenion possible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
