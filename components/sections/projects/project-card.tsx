"use client";

import Link from "next/link";
import { ArrowUpRight, Users, Eye, Lock, UserPlus, Globe } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { formatDistanceToNow } from "@/lib/date";
import { getProjectLifecycleStatus } from "@/lib/lifecycle";

export interface RecruitmentRole {
  id: string;
  title: string;
  experience: "beginner" | "intermediate" | "advanced";
  positions: number;
  description: string;
}

export interface ProjectCardProject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  visibility: string;
  lifecycle_status?: string | null;
  last_activity_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  technologies: string[];
  recruitment: RecruitmentRole[];
  categories: { id: string; name: string; slug: string }[];
  owner: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  team: { name: string; slug: string } | null;
  member_count: number;
  role?: "owner" | "admin" | "member" | null;
}

const visibilityConfig: Record<string, { icon: typeof Globe; label: string }> = {
  open: { icon: Globe, label: "Open" },
  invite_only: { icon: UserPlus, label: "Invite only" },
  private: { icon: Lock, label: "Private" },
};

interface ProjectCardProps {
  project: ProjectCardProject;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const techs = project.technologies ?? [];
  const visibleTechs = techs.slice(0, 4);
  const techOverflow = techs.length - visibleTechs.length;

  const roles = project.recruitment ?? [];
  const visibleRoles = roles.slice(0, 2);
  const roleOverflow = roles.length - visibleRoles.length;

  const vis = visibilityConfig[project.visibility];
  const lifecycle = getProjectLifecycleStatus(project.last_activity_at);

  return (
    <Reveal delay={index * 60}>
      <Link href={`/projects/${project.slug}`} className="group block h-full focus-visible:outline-none">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border-strong/[0.08] card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm group-focus-visible:ring-2 group-focus-visible:ring-accent-400/60">
          <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative flex flex-1 flex-col p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-accent-400/30 bg-accent/[0.08] p-2.5">
                {project.logo_url ? (
                  <img src={project.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <Users className="h-6 w-6 text-accent-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                  {project.name}
                </h3>
                {project.team ? (
                  <p className="mt-0.5 text-sm text-ink-500">
                    {`by ${project.team.name}`}
                  </p>
                ) : project.owner ? (
                  <p className="mt-0.5 text-sm text-ink-500">
                    {`by ${project.owner.full_name || `@${project.owner.username}`}`}
                  </p>
                ) : null}
              </div>
            </div>

            {project.categories && project.categories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-blue-300"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            ) : null}

            {project.description ? (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-400">
                {project.description}
              </p>
            ) : null}

            {techs.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {visibleTechs.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex rounded-full border border-accent/20 bg-accent/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-accent-300"
                  >
                    {tech}
                  </span>
                ))}
                {techOverflow > 0 ? (
                  <span className="inline-flex rounded-full border border-ink-700/50 bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                    +{techOverflow}
                  </span>
                ) : null}
              </div>
            ) : null}

            {roles.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-ink-500">Looking for:</span>
                {visibleRoles.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-amber-400"
                  >
                    {role.title}
                  </span>
                ))}
                {roleOverflow > 0 ? (
                  <span className="inline-flex rounded-full border border-ink-700/50 bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                    +{roleOverflow}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-auto pt-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
                {vis ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border-strong/[0.08] bg-surface px-2 py-0.5 font-medium text-ink-400">
                    {(() => {
                      const Icon = vis.icon;
                      return <Icon size={10} />;
                    })()}
                    {vis.label}
                  </span>
                ) : null}
                {lifecycle === "ARCHIVED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/[0.07] px-2 py-0.5 font-medium text-red-400">
                    Archived
                  </span>
                ) : lifecycle === "INACTIVE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/[0.07] px-2 py-0.5 font-medium text-amber-400">
                    Inactive
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Users size={12} className="text-accent-400" />
                  {project.member_count}
                </span>
                {project.updated_at ? (
                  <span suppressHydrationWarning>Updated {formatDistanceToNow(new Date(project.updated_at))}</span>
                ) : project.created_at ? (
                  <span suppressHydrationWarning>Created {formatDistanceToNow(new Date(project.created_at))}</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
              View project
              <ArrowUpRight size={14} />
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
