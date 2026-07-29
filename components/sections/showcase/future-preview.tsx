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
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="future-preview-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[30%] top-[20%] h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute right-[10%] bottom-[20%] h-56 w-56 rounded-full bg-accent-400/8 blur-[120px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[12%] top-[18%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[82%] top-[12%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[18%] top-[78%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[78%] top-[80%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[48%] top-[5%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[92%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[5%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[62%] top-[92%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

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

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PREVIEWS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 60}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
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
