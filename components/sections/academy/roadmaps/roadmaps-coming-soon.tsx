import { FlaskConical, GraduationCap, Milestone, Route } from "lucide-react";

import { serverT } from "@/lib/translation/server";

/**
 * Coming Soon treatment for /academy/roadmaps.
 *
 * Intentionally presentational: no catalog access, no search, no filters,
 * no progress, no roadmap nodes. The interactive roadmap foundation
 * (lib/roadmaps + roadmap-* components) stays in the repo untouched until
 * the backend lands.
 */
export async function RoadmapsComingSoon() {
  const pillars = [
    {
      icon: GraduationCap,
      label: await serverT("academy.roadmapsPillarCourses"),
    },
    {
      icon: FlaskConical,
      label: await serverT("academy.roadmapsPillarLabs"),
    },
    {
      icon: Milestone,
      label: await serverT("academy.roadmapsPillarStages"),
    },
  ];

  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="roadmaps-coming-soon-heading"
    >
      <div className="mx-auto max-w-[880px] px-5 sm:px-8">
        
          <div className="relative overflow-hidden rounded-lg card-surface-soft px-8 py-16 text-center sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
            />
            <div className="relative flex flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
                {await serverT("academy.roadmapsComingSoon")}
              </span>

              <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-lg bg-surface text-accent-300">
                <Route size={32} aria-hidden />
              </div>

              <h2
                id="roadmaps-coming-soon-heading"
                className="mt-8 max-w-md text-balance text-2xl font-semibold text-ink-50 sm:text-3xl"
              >
                {await serverT("academy.roadmapsComingSoonTitle")}
              </h2>
              <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                {await serverT("academy.roadmapsComingSoonSub")}
              </p>

              <ul className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
                {pillars.map((pillar) => (
                  <li
                    key={pillar.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-ink-200"
                  >
                    <pillar.icon
                      size={15}
                      aria-hidden
                      className="text-accent-300"
                    />
                    {pillar.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        
      </div>
    </section>
  );
}
