import { Briefcase, Users, Target } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import type { RecruitmentRole } from "./recruitment-editor";

interface ProjectPageRecruitmentProps {
  roles: RecruitmentRole[];
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner-friendly",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const EXPERIENCE_COLORS: Record<string, string> = {
  beginner: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
  intermediate: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
  advanced: "border-red-400/25 bg-red-400/[0.08] text-red-300",
};

export function ProjectPageRecruitment({ roles }: ProjectPageRecruitmentProps) {
  if (roles.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-recruitment-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Hiring
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-recruitment-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Open positions
            <span className="ml-3 text-lg font-normal text-ink-500">({roles.length})</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {roles.map((role, i) => (
            <Reveal key={role.id} delay={i * 80}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08]">
                        <Briefcase size={16} className="text-accent-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[1rem] font-semibold text-ink-50">
                          {role.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-ink-500">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${EXPERIENCE_COLORS[role.experience] || EXPERIENCE_COLORS.intermediate}`}>
                            <Target size={10} />
                            {EXPERIENCE_LABELS[role.experience] || role.experience}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} className="text-accent-400" />
                            {role.positions} {role.positions === 1 ? "position" : "positions"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {role.description ? (
                    <p className="mt-4 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                      {role.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
