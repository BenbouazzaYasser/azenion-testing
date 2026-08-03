"use client";

import { ArrowUpRight, Users, Eye, Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

interface ProjectCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  visibility: string;
  member_count: number;
  team: { name: string; slug: string } | null;
}

interface ProjectShowcaseProps {
  projects: ProjectCard[];
}

const VISIBILITY_ICONS: Record<string, typeof Eye> = {
  open: Eye,
  private: Lock,
  invite_only: UserPlus,
};

const VISIBILITY_LABELS: Record<string, string> = {
  open: "Open",
  private: "Private",
  invite_only: "Invite only",
};

export function ProjectShowcase({ projects }: ProjectShowcaseProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="showcase-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Featured
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="showcase-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Featured projects
          </h2>
          <p className="mt-4 max-w-xl text-[1.02rem] leading-7 text-ink-400">
            Discover open projects seeking collaborators across the Limitless Network.
          </p>
        </Reveal>

        {projects.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <Reveal key={project.id} delay={i * 80}>
                <Link href={`/projects/${project.slug}`} className="group block h-full">
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                    <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] p-2">
                            {project.logo_url ? (
                              <img src={project.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              <Users className="h-5 w-5 text-accent-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                              {project.name}
                            </h3>
                            {project.team ? (
                              <p className="mt-0.5 truncate text-sm text-ink-500">{project.team.name}</p>
                            ) : null}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-strong bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-400">
                          {(() => {
                            const Icon = VISIBILITY_ICONS[project.visibility] || Eye;
                            return <Icon size={11} />;
                          })()}
                          {VISIBILITY_LABELS[project.visibility] || project.visibility}
                        </span>
                      </div>

                      {project.description ? (
                        <p className="mt-3 flex-1 text-[0.88rem] leading-relaxed text-ink-400 line-clamp-2">
                          {project.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex items-center gap-4 text-sm text-ink-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={13} className="text-accent-400" />
                          {project.member_count} {project.member_count === 1 ? "member" : "members"}
                        </span>
                      </div>

                      <div className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        View Project
                        <ArrowUpRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={120}>
            <div className="mt-10 rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-14 text-center shadow-card backdrop-blur-xl">
              <div className="flex flex-col items-center gap-3">
                <Users className="h-8 w-8 text-ink-600" />
                <p className="max-w-xs text-sm text-ink-400">
                  No public projects yet. The first one to launch will appear here.
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
