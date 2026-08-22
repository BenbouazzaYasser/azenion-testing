import {
  Code2,
  Users,
  Briefcase,
  Swords,
  Rocket,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

const REASONS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Code2,
    title: "Find complementary skills",
    description:
      "Every project needs a mix of talents. Teams let you find the developers, designers, and thinkers who fill the gaps in your own toolkit.",
  },
  {
    icon: Users,
    title: "Learn from others",
    description:
      "The fastest way to grow is to build alongside people who know more than you — and people who you can teach in return.",
  },
  {
    icon: Briefcase,
    title: "Build real-world projects",
    description:
      "Theory teaches you the rules. Building teaches you how to break them. Team projects give you the portfolio that speaks louder than any grade.",
  },
  {
    icon: Swords,
    title: "Prepare for hackathons",
    description:
      "Hackathons are won by teams that already know how to work together. Form your squad now and arrive ready to ship.",
  },
  {
    icon: Rocket,
    title: "Launch startups together",
    description:
      "Some of the best startups began as college side projects. A team that trusts each other can move from idea to launch faster than any solo founder.",
  },
  {
    icon: GraduationCap,
    title: "Build leadership experience",
    description:
      "Leading a team teaches you more about communication, delegation, and decision-making than any classroom ever could.",
  },
];

export function WhyTeams() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="why-teams-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="why-teams-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Why teams?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            Collaboration is the force that turns potential into reality.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={i * 60} className="flex">
                <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border-strong/[0.08] card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong/[0.08] bg-surface text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <Icon size={17} strokeWidth={1.75} className="relative" />
                    </div>

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {reason.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                      {reason.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
