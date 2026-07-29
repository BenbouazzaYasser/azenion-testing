import { ArrowDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ECOSYSTEM_ITEMS } from "@/data/about";
import { Reveal } from "@/components/ui/reveal";

function EcosystemCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div className="group relative flex-1 overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.06] text-[11px] font-semibold text-accent-400">
            {index + 1}
          </span>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-0.5 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
            <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <Icon size={18} strokeWidth={1.75} className="relative" />
          </div>
        </div>
        <h3 className="mt-4 text-[1rem] font-semibold text-ink-50">{title}</h3>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export function Ecosystem() {
  const firstRow = ECOSYSTEM_ITEMS.slice(0, 3);
  const secondRow = ECOSYSTEM_ITEMS.slice(3, 6);

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="ecosystem-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.10),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[40%] top-[25%] h-72 w-72 -translate-x-1/2 rounded-full bg-accent/8 blur-[140px]" />
      <div className="pointer-events-none absolute right-[10%] bottom-[20%] h-48 w-48 rounded-full bg-accent-400/8 blur-[100px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[15%] top-[20%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[80%] top-[10%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[30%] top-[75%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[70%] top-[80%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[50%] top-[5%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[88%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[8%] top-[55%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[55%] top-[90%] h-[3px] w-[3px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="ecosystem-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            The ecosystem
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            How the pieces fit together — from joining a branch to making an impact.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-3">
          {firstRow.map((item, i) => (
            <Reveal key={item.title} delay={i * 80} className="flex lg:flex-1">
              <EcosystemCard icon={item.icon} title={item.title} description={item.description} index={i} />
            </Reveal>
          ))}
        </div>

        <div className="flex justify-center py-4 sm:py-5">
          <div className="flex h-8 w-px items-center justify-center bg-gradient-to-b from-accent-400/30 via-accent-400/15 to-accent-400/30">
            <ArrowDown size={14} className="text-accent-400/50" />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-3">
          {secondRow.map((item, i) => (
            <Reveal key={item.title} delay={(i + 3) * 80} className="flex lg:flex-1">
              <EcosystemCard icon={item.icon} title={item.title} description={item.description} index={i + 3} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={550}>
          <div className="mx-auto mt-12 max-w-lg text-center">
            <p className="text-sm leading-relaxed text-ink-500">
              Every part of the ecosystem is designed to move you forward —
              from finding your people to building something that matters.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
