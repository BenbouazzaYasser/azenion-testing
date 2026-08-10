import { UserPlus, Compass, HeartHandshake, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Join",
    description:
      "Create your free account and step into the network. Your profile is your entry point.",
  },
  {
    icon: Compass,
    step: "02",
    title: "Find your community",
    description:
      "Browse branches, teams and projects until you find the people and missions that match you.",
  },
  {
    icon: HeartHandshake,
    step: "03",
    title: "Collaborate",
    description:
      "Join a team or project, share updates, and build alongside people who push you further.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Build impact",
    description:
      "Ship real work, grow your reputation, and help the network build something larger than any one person.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              How it works
            </span>
            <h2
              id="how-it-works-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
            >
              Four steps from <span className="text-accent-400">newcomer to builder.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-400">
              The path into Azenion is simple. Once you start, the network does
              the heavy lifting.
            </p>
          </div>
        </Reveal>

        <ol className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Connecting line */}
          <div
            aria-hidden
            className="absolute left-[27px] top-0 hidden h-full w-px bg-gradient-to-b from-accent-400/0 via-accent-400/30 to-accent-400/0 sm:block lg:left-0 lg:top-[27px] lg:h-px lg:w-full lg:bg-gradient-to-r"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.step} className="relative">
                <Reveal delay={i * 120}>
                  <div className="flex gap-5 lg:flex-col lg:items-center lg:text-center">
                    <div className="relative z-10 shrink-0">
                      <div className="animate-pulse-glow flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/30 bg-void-900 text-accent-300 shadow-glow-sm">
                        <Icon size={24} strokeWidth={1.75} />
                      </div>
                      <span
                        aria-hidden
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-accent-400/40 bg-accent text-[11px] font-bold text-white"
                      >
                        {step.step}
                      </span>
                    </div>

                    <div className={cn("min-w-0", "lg:mt-6")}>
                      <h3 className="text-lg font-semibold text-ink-50">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
