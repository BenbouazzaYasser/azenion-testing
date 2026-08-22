import Link from "next/link";
import { ArrowUpRight, Code2, Sparkles, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

interface ShowcaseFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURED: ShowcaseFeature[] = [
  {
    icon: Code2,
    title: "Community Projects",
    description:
      "Outstanding projects built by Azenion members — open-source tools, full-stack platforms and everything in between.",
  },
  {
    icon: Swords,
    title: "Winning Teams",
    description:
      "Hackathon champions and competition winners who represented Azenion and brought home trophies.",
  },
  {
    icon: Sparkles,
    title: "Events & Hackathons",
    description:
      "Build nights, speaker sessions and hackathons that sparked new ideas across the network.",
  },
];

export function ShowcasePreview() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="showcase-preview-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Sparkles size={13} />
                Showcase
              </span>
              <h2
                id="showcase-preview-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                A stage for the best work{" "}
                <span className="text-accent-400">we build together.</span>
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-400">
                The showcase will celebrate the projects, teams and milestones
                this community is proud of.
              </p>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <a href="/showcase">
                Browse Showcase
                <ArrowUpRight size={16} />
              </a>
            </Button>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 100} className="h-full">
                <Link
                  href="/showcase"
                  className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface p-7 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
                >
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] border border-accent-400/25 bg-accent/[0.08] text-accent-300 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:shadow-glow-sm">
                        <Icon size={20} strokeWidth={1.75} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/[0.08] bg-surface px-3 py-1 text-[11px] font-medium text-ink-500">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-accent-400" />
                        Coming soon
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-400">
                      {item.description}
                    </p>

                    <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-80 transition-all duration-300 group-hover:gap-2.5 group-hover:opacity-100">
                      View Showcase
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
