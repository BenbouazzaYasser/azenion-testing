"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Building2, FolderKanban, Users } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

interface Stat {
  label: string;
  value: number;
  icon: typeof Users;
}

const FORMATTERS: Record<string, (value: number) => string> = {
  "members": (v) => v.toLocaleString(),
  "teams": (v) => v.toLocaleString(),
  "projects": (v) => v.toLocaleString(),
  "branches": (v) => v.toLocaleString(),
};

function useCountUp(target: number, duration = 1400) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]) return;
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration]);

  return { display, ref };
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const Icon = stat.icon;
  const { display, ref } = useCountUp(stat.value);
  const formatter = FORMATTERS[stat.label.toLowerCase()] ?? ((v: number) => v.toLocaleString());

  return (
    <Reveal delay={index * 100}>
      <div
        ref={ref}
        className="flex flex-col items-center gap-3 rounded-[2rem] border border-border-strong card-surface-soft p-8 text-center shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] text-accent-300">
          <Icon size={22} strokeWidth={1.75} />
        </span>
        <span className="text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          {formatter(display)}
        </span>
        <span className="text-sm font-medium uppercase tracking-[0.16em] text-ink-400">
          {stat.label}
        </span>
      </div>
    </Reveal>
  );
}

interface CommunityNumbersProps {
  members: number;
  teams: number;
  projects: number;
  branches: number;
}

export function CommunityNumbers({ members, teams, projects, branches }: CommunityNumbersProps) {
  const stats: Stat[] = [
    { label: "Members", value: members, icon: Users },
    { label: "Teams", value: teams, icon: FolderKanban },
    { label: "Projects", value: projects, icon: BarChart3 },
    { label: "Branches", value: branches, icon: Building2 },
  ];

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="community-numbers-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              The numbers
            </span>
            <h2
              id="community-numbers-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
            >
              A network that keeps <span className="text-accent-400">growing.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
