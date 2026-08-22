import { CheckCircle2, Hourglass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

interface RoadmapItem {
  title: string;
  description: string;
  status: "done" | "next" | "planned";
}

const ROADMAP: RoadmapItem[] = [
  {
    title: "Platform foundation",
    description:
      "Profiles, authentication and the core building blocks that make Azenion feel like home.",
    status: "done",
  },
  {
    title: "Community system",
    description:
      "Branches, teams, projects and the shared feed that keep the network connected.",
    status: "done",
  },
  {
    title: "Teams & projects",
    description:
      "Memberships, open roles, recruitment and the collaboration layer between builders.",
    status: "done",
  },
  {
    title: "Academy expansion",
    description:
      "Courses, labs and a richer learning experience built around the community.",
    status: "next",
  },
  {
    title: "Mobile app",
    description:
      "Take the network anywhere with a native Azenion experience on your phone.",
    status: "planned",
  },
  {
    title: "Global community",
    description:
      "More branches, more regions and a truly limitless network across the world.",
    status: "planned",
  },
];

const STATUS_LABEL: Record<RoadmapItem["status"], string> = {
  done: "Shipped",
  next: "Up next",
  planned: "Planned",
};

export function Roadmap() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="roadmap-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              Roadmap
            </span>
            <h2
              id="roadmap-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
            >
              Where Azenion is <span className="text-accent-400">heading.</span>
            </h2>
            <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-400">
              A look at what we&apos;ve shipped and what&apos;s coming next.
            </p>
          </div>
        </Reveal>

        <ol className="relative mx-auto mt-16 max-w-3xl">
          <div
            aria-hidden
            className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-400/40 via-accent-400/20 to-accent-400/0"
          />

          {ROADMAP.map((item, i) => {
            const Icon = item.status === "done" ? CheckCircle2 : Hourglass;
            return (
              <li key={item.title} className="relative pb-10 last:pb-0">
                <Reveal delay={i * 80}>
                  <div className="flex gap-5">
                    <span
                      className={cn(
                        "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-void-900 shadow-glow-sm",
                        item.status === "done"
                          ? "border-emerald-500/40 text-emerald-400"
                          : item.status === "next"
                            ? "border-accent-400/40 text-accent-300"
                            : "border-border-strong text-ink-500"
                      )}
                    >
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-[1.5rem] border border-border-strong/[0.08] card-surface-soft p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-accent-400/30 hover:shadow-glow-sm sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-ink-50">{item.title}</h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                            item.status === "done"
                              ? "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400"
                              : item.status === "next"
                                ? "border-accent/25 bg-accent/[0.08] text-accent-300"
                                : "border-border-strong bg-surface text-ink-500"
                          )}
                        >
                          {item.status === "done" ? <CheckCircle2 size={10} /> : null}
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        <Reveal delay={ROADMAP.length * 60}>
          <p className="mx-auto mt-12 flex max-w-3xl items-center justify-center gap-2 text-center text-sm text-ink-500">
            <Sparkles size={14} className="shrink-0 text-accent-400" />
            This roadmap evolves with the community. Have an idea? Share it in a team or branch.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
