import { UserPlus, Compass, HeartHandshake, Rocket } from "lucide-react";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

// A real sequence: join, find, collaborate, ship. Numbers stay because the
// order is the information — but they're plain figures, not 01/02 markers.
const STEPS: { icon: typeof UserPlus; titleKey: DictKey; descKey: DictKey }[] = [
  {
    icon: UserPlus,
    titleKey: "home.stepJoin",
    descKey: "home.stepJoinDesc",
  },
  {
    icon: Compass,
    titleKey: "home.stepFind",
    descKey: "home.stepFindDesc",
  },
  {
    icon: HeartHandshake,
    titleKey: "home.stepCollaborate",
    descKey: "home.stepCollaborateDesc",
  },
  {
    icon: Rocket,
    titleKey: "home.stepImpact",
    descKey: "home.stepImpactDesc",
  },
];

export async function HowItWorks() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-normal text-ink-500">
            {await serverT("home.howEyebrow")}
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
          >
            {await serverT("home.howTitle")}{await serverT("home.howAccent")}
          </h2>
          <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-400">
            {await serverT("home.howSub")}
          </p>
        </div>

        <ol className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {(await Promise.all(STEPS.map(async (step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.titleKey} className="border-t border-border pt-6">
                <div className="flex items-baseline justify-between">
                  <span
                    aria-hidden
                    className="font-display text-3xl font-semibold tabular-nums text-ink-700"
                  >
                    {i + 1}
                  </span>
                  <Icon size={18} strokeWidth={1.75} className="text-accent-300" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-50">{await serverT(step.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {await serverT(step.descKey)}
                </p>
              </li>
            );
          })))}
        </ol>
      </div>
    </section>
  );
}
