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
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="why-build-heading">
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={i * 60}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
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
