import Link from "next/link";
import { GraduationCap, Video, FlaskConical, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
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
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              {await serverT("academy.featuresEyebrow")}
            </span>
            <h2
              id="academy-features-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              {await serverT("academy.featuresH2")} <span className="text-accent-400">{await serverT("academy.featuresH2Accent")}</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {await Promise.all(FEATURES.map(async (feature, i) => (
            <Reveal key={feature.titleKey} delay={i * 120}>
              <article className="group flex h-full flex-col rounded-[2rem] card-surface p-8 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 shadow-[0_0_24px_-6px_rgba(109,109,255,0.5)]">
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
            </Reveal>
          )))}
        </div>
      </div>
    </section>
  );
}
