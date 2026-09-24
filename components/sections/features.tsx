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
        <div className="grid border-t border-border sm:grid-cols-2">
          {(await Promise.all(FEATURE_ITEMS.map(async (feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                className="group relative border-b border-border py-10 sm:px-8 sm:py-12 sm:odd:pr-8 sm:even:border-s sm:even:pl-8 lg:px-10"
              >
                <div className="flex items-start">
                  <Icon size={19} strokeWidth={1.75} className="text-accent-300" aria-hidden />
                </div>
                <h3 className="mt-8 text-xl font-semibold text-ink-50">{await serverT(feature.titleKey)}</h3>
                <p className="mt-2 max-w-[28ch] text-[0.9rem] leading-relaxed text-ink-300">
                  {await serverT(feature.descKey)}
                </p>
              </div>
            );
          })))}
        </div>
      </div>
    </section>
  );
}
