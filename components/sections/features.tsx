import type { LucideIcon } from "lucide-react";
import { Users, Layers, Rocket, Sparkles } from "lucide-react";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const FEATURE_ITEMS: { icon: LucideIcon; titleKey: DictKey; descKey: DictKey }[] = [
  {
    icon: Users,
    titleKey: "home.featureConnect",
    descKey: "home.featureConnectDesc",
  },
  {
    icon: Layers,
    titleKey: "home.featureCollaborate",
    descKey: "home.featureCollaborateDesc",
  },
  {
    icon: Rocket,
    titleKey: "home.featureInnovate",
    descKey: "home.featureInnovateDesc",
  },
  {
    icon: Sparkles,
    titleKey: "home.featureElevate",
    descKey: "home.featureElevateDesc",
  },
];

export async function Features() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="features-heading">
      <h2 id="features-heading" className="sr-only">
        {await serverT("home.featuresSr")}
      </h2>
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {await Promise.all(FEATURE_ITEMS.map(async (feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                className="group relative px-1 py-10 transition-colors duration-300 sm:px-7 sm:py-12 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-accent-400 transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:border-accent-400/40 group-hover:bg-accent/[0.06] group-hover:shadow-glow-sm">
                  <Icon size={19} strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-[1.05rem] font-semibold text-ink-50">
                  {await serverT(feature.titleKey)}
                </h3>
                <p className="mt-2.5 max-w-[24ch] text-[0.9rem] leading-relaxed text-ink-400">
                  {await serverT(feature.descKey)}
                </p>
              </div>
            );
          }))}
        </div>
      </div>
    </section>
  );
}
