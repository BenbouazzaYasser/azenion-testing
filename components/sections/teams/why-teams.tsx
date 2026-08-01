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
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="why-teams-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[30%] top-[20%] h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[15%] bottom-[20%] h-48 w-48 rounded-full bg-accent-400/8 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[15%] top-[15%] h-[3px] w-[3px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[80%] top-[20%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[20%] top-[75%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[75%] top-[70%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[50%] top-[8%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[90%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[8%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[60%] top-[92%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
      </div>

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

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={i * 60} className="flex">
                <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
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
