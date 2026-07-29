import { Target, BookOpen, Briefcase, FolderKanban, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

interface Reason {
  icon: LucideIcon;
  title: string;
  description: string;
}

const REASONS: Reason[] = [
  {
    icon: Target,
    title: "Find talented collaborators",
    description:
      "Connect with developers, designers, and creators who share your ambition and complement your skills.",
  },
  {
    icon: BookOpen,
    title: "Learn by building",
    description:
      "Theory teaches you the rules. Building teaches you how to break them — and how to ship something real.",
  },
  {
    icon: Briefcase,
    title: "Gain real-world experience",
    description:
      "Team projects give you the portfolio and confidence that stands out to employers, investors, and peers.",
  },
  {
    icon: FolderKanban,
    title: "Create an impressive portfolio",
    description:
      "Every project you contribute to becomes a chapter in your professional story. Build proof of what you can do.",
  },
  {
    icon: Rocket,
    title: "Turn ideas into startups",
    description:
      "Some of the world's best companies began as side projects. Your next idea could be the one that changes everything.",
  },
];

export function WhyBuild() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="why-build-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[25%] top-[25%] h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[15%] bottom-[20%] h-48 w-48 rounded-full bg-accent-400/8 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[18%] top-[12%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[82%] top-[22%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[15%] top-[72%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[72%] top-[82%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[50%] top-[5%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[92%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[5%] top-[55%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[65%] top-[92%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Why build together?
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="why-build-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Why build together?
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={i * 60}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
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
