import {
  Code2,
  Users,
  Briefcase,
  Swords,
  Rocket,
  GraduationCap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

const REASONS: { icon: LucideIcon; titleKey: DictKey; descKey: DictKey }[] = [
  { icon: Code2, titleKey: "teams.why1Title", descKey: "teams.why1Desc" },
  { icon: Users, titleKey: "teams.why2Title", descKey: "teams.why2Desc" },
  { icon: Briefcase, titleKey: "teams.why3Title", descKey: "teams.why3Desc" },
  { icon: Swords, titleKey: "teams.why4Title", descKey: "teams.why4Desc" },
  { icon: Rocket, titleKey: "teams.why5Title", descKey: "teams.why5Desc" },
  { icon: GraduationCap, titleKey: "teams.why6Title", descKey: "teams.why6Desc" },
];

export async function WhyTeams() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="why-teams-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="why-teams-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("teams.whyTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            {await serverT("teams.whySub")}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {await Promise.all(REASONS.map(async (reason, i) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.titleKey} delay={i * 60} className="flex">
                <div className="group flex w-full flex-col overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm">
                      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <Icon size={17} strokeWidth={1.75} className="relative" />
                    </div>

                    <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                      {await serverT(reason.titleKey)}
                    </h3>
                    <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                      {await serverT(reason.descKey)}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          }))}
        </div>
      </div>
    </section>
  );
}
