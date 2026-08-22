import {
  Network,
  HeartHandshake,
  Lightbulb,
  Rocket,
  GraduationCap,
  Users,
  Layers,
  TrendingUp,
} from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { DashboardButton } from "@/components/shared/dashboard-button";

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Learn",
    description: "Grow through courses, sessions and shared knowledge.",
  },
  {
    icon: Users,
    title: "Collaborate",
    description: "Build with people who push your work further.",
  },
  {
    icon: Lightbulb,
    title: "Innovate",
    description: "Turn ideas into real products and lasting projects.",
  },
  {
    icon: TrendingUp,
    title: "Elevate",
    description: "Rise together and carry the network forward.",
  },
];

const FOCUS_CARDS = [
  {
    icon: Network,
    title: "A network, not a platform",
    description:
      "Azenion is a living community. When you join, you plug into a web of ambitious people across branches, teams and projects — not a catalog of courses.",
  },
  {
    icon: HeartHandshake,
    title: "Collaboration over competition",
    description:
      "We believe exceptional people are built together. Azenion rewards sharing, mentoring and building in the open instead of competing in silence.",
  },
  {
    icon: Rocket,
    title: "For ambitious students",
    description:
      "Built for students who refuse to wait to be discovered. The network exists to connect you with the people and opportunities that accelerate your growth.",
  },
  {
    icon: Layers,
    title: "One continuous journey",
    description:
      "Learn a skill, find your community, collaborate on a project, and turn it into impact. Every part of Azenion feeds the next.",
  },
];

export function WhyAzenion() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="why-azenion-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* Copy */}
          <Reveal>
            <div className="lg:sticky lg:top-32">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Network size={13} />
                Why Azenion
              </span>

              <h2
                id="why-azenion-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                Not just another learning platform.
                <span className="text-accent-400"> A network.</span>
              </h2>

              <p className="mt-5 max-w-xl text-[1.02rem] leading-8 text-ink-400">
                Most platforms give you content and leave you alone. Azenion gives
                you a community — ambitious students connecting through branches,
                teams and projects, pushing each other to build meaningful work.
              </p>

              <p className="mt-4 max-w-xl text-[1.02rem] leading-8 text-ink-400">
                The belief is simple: collaboration beats competition, and talent
                grows fastest when it is connected to other talent.
              </p>

              <DashboardButton size="lg" className="mt-8" label="Join the movement" />
            </div>
          </Reveal>

          {/* Focus cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {FOCUS_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <Reveal key={card.title} delay={i * 80} className="h-full">
                  <div className="group relative h-full overflow-hidden rounded-[1.6rem] border border-border-strong/[0.08] card-surface-soft p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:card-surface hover:shadow-glow-sm sm:p-7">
                    <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.07),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glow-sm">
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <h3 className="relative mt-5 text-[1.05rem] font-semibold text-ink-50">
                      {card.title}
                    </h3>
                    <p className="relative mt-2.5 text-sm leading-relaxed text-ink-400">
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>

      {/* Value pillars */}
      <div className="mx-auto mt-[0.875rem] max-w-[1320px] px-5 sm:px-8 lg:mt-[1.5rem] lg:px-12">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="group relative overflow-hidden rounded-[1.4rem] border border-border-strong/[0.08] card-surface-soft p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:card-surface hover:shadow-glow-sm"
                >
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.07),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="relative flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-glow-sm">
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink-50">{pillar.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
