import { Code2, Swords, Sparkles, Trophy, Rocket, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

interface PreviewItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PREVIEWS: PreviewItem[] = [
  {
    icon: Code2,
    title: "Community Projects",
    description:
      "Outstanding projects built by Azenion members — from open-source tools to full-stack platforms and everything in between.",
  },
  {
    icon: Swords,
    title: "Winning Teams",
    description:
      "Hackathon champions and competition winners who represented Azenion and brought home trophies from across the region.",
  },
  {
    icon: Sparkles,
    title: "Events & Hackathons",
    description:
      "Moments that brought the community together — build nights, speaker sessions, and hackathons that sparked new ideas.",
  },
  {
    icon: Trophy,
    title: "Member Achievements",
    description:
      "Individual milestones worth celebrating — from landing dream internships to launching first products.",
  },
  {
    icon: Rocket,
    title: "Startup Stories",
    description:
      "Projects that grew beyond the network — real startups founded by Azenion members, born from late-night collaboration.",
  },
  {
    icon: BarChart3,
    title: "Platform Milestones",
    description:
      "Key moments in Azenion's own growth — new branches, member counts, feature launches, and community records.",
  },
];

export function FuturePreview() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="future-preview-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Preview
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="future-preview-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            What You&apos;ll Find Here
          </h2>
          <p className="mt-4 max-w-xl text-[1.02rem] leading-7 text-ink-400">
            A glimpse of the content that will fill this space as the community grows.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PREVIEWS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 60}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border-strong card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <Icon size={17} strokeWidth={1.75} className="relative" />
                    </div>

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {item.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                      {item.description}
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
