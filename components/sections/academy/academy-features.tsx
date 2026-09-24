import Link from "next/link";
import { GraduationCap, Route, Video, FlaskConical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { serverT } from "@/lib/translation/server";

// Keys reference the dictionary; strings are resolved via serverT() at render.
const FEATURES = [
  {
    icon: GraduationCap,
    titleKey: "academy.coursesTitle",
    descKey: "academy.coursesDesc",
    href: "/academy/courses",
    actionKey: "academy.exploreCourses",
  },
  {
    icon: Route,
    titleKey: "academy.roadmapsTitle",
    descKey: "academy.roadmapsDesc",
    href: "/academy/roadmaps",
    actionKey: "academy.exploreRoadmaps",
  },
  {
    icon: Video,
    titleKey: "academy.sessionsTitle",
    descKey: "academy.sessionsDesc",
    href: "/academy/live-sessions",
    actionKey: "academy.exploreSessions",
  },
  {
    icon: FlaskConical,
    titleKey: "academy.labs",
    descKey: "academy.labsDesc",
    href: "/academy/labs",
    actionKey: "academy.exploreLabs",
  },
] as const;

export async function AcademyFeatures() {
  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="academy-features-heading"
    >
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8 lg:px-12">
        
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
              {await serverT("academy.featuresEyebrow")}
            </span>
            <h2
              id="academy-features-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              {await serverT("academy.featuresH2")} {await serverT("academy.featuresH2Accent")}
            </h2>
          </div>
        

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {(await Promise.all(FEATURES.map(async (feature, i) => (
            
              <article key={feature.titleKey} className="group flex h-full flex-col rounded-2xl card-surface p-8 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 shadow-card">
                    <feature.icon size={22} />
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-semibold text-ink-50">
                  {await serverT(feature.titleKey)}
                </h3>
                <p className="mt-2.5 flex-1 text-[0.95rem] leading-relaxed text-ink-400">
                  {await serverT(feature.descKey)}
                </p>

                <div className="mt-8">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={feature.href}>
                      {await serverT(feature.actionKey)}
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </Button>
                </div>
              </article>
            
          ))))}
        </div>
      </div>
    </section>
  );
}
