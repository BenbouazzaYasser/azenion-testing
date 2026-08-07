"use client";

import Link from "next/link";
import { ArrowUpRight, Users, FolderKanban, MessageSquare } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { TeamCategoryBadge } from "./team-category-badge";
import { formatDistanceToNow } from "@/lib/date";
import { getTeamStatus, isTeamHidden } from "@/lib/lifecycle";

export interface TeamOpenRole {
  title: string;
}

export interface TeamCardTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  visibility: string;
  status?: string | null;
  last_activity_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  technologies: string[];
  categories: { id: string; name: string; slug: string }[];
  owner: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  member_count: number;
  project_count: number;
  update_count: number;
  open_roles: TeamOpenRole[];
}

interface TeamCardProps {
  team: TeamCardTeam;
  index: number;
}

export function TeamCard({ team, index }: TeamCardProps) {
  const techs = team.technologies ?? [];
  const visibleTechs = techs.slice(0, 5);
  const techOverflow = techs.length - visibleTechs.length;

  const roles = team.open_roles ?? [];
  const visibleRoles = roles.slice(0, 4);
  const roleOverflow = roles.length - visibleRoles.length;

  const cats = team.categories ?? [];
  const visibleCats = cats.slice(0, 3);
  const catOverflow = cats.length - visibleCats.length;

  const inactive = getTeamStatus(team.last_activity_at) === "inactive";
  const hidden = isTeamHidden(team.last_activity_at);

  return (
    <Reveal delay={index * 60}>
      <Link href={`/teams/${team.slug}`} className="group block h-full focus-visible:outline-none">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] group-focus-visible:ring-2 group-focus-visible:ring-accent-400/60">
          <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="relative flex flex-1 flex-col p-6 sm:p-8">
            {/* Top: Logo, Name, Owner, Category */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-accent-400/30 bg-accent/[0.08] p-2.5">
                {team.logo_url ? (
                  <img src={team.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <Users className="h-6 w-6 text-accent-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                  {team.name}
                </h3>
                {team.owner ? (
                  <p className="mt-0.5 text-sm text-ink-500">
                    by {team.owner.full_name || `@${team.owner.username}`}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Lifecycle */}
            {inactive || hidden ? (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {inactive ? (
                  <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                    Inactive
                  </span>
                ) : null}
                {hidden ? (
                  <span className="inline-flex rounded-full border border-red-500/25 bg-red-500/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                    Hidden from discovery
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Categories */}
            {cats.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {visibleCats.map((cat) => (
                  <TeamCategoryBadge key={cat.id} name={cat.name} />
                ))}
                {catOverflow > 0 ? (
                  <span className="inline-flex rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                    +{catOverflow}
                  </span>
                ) : null}
              </div>
            ) : null}

            {team.description ? (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-400">
                {team.description}
              </p>
            ) : null}

            {/* Technologies */}
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
                  <span className="inline-flex rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                    +{techOverflow}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Recruiting */}
            {roles.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-ink-500">Looking for:</span>
                {visibleRoles.map((role, i) => (
                  <span
                    key={`${role.title}-${i}`}
                    className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-0.5 text-[11px] font-medium text-amber-400"
                  >
                    {role.title}
                  </span>
                ))}
                {roleOverflow > 0 ? (
                  <span className="inline-flex rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                    +{roleOverflow}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Stats Row */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} className="text-accent-400" />
                {team.member_count} {team.member_count === 1 ? "member" : "members"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban size={13} className="text-accent-400" />
                {team.project_count} {team.project_count === 1 ? "project" : "projects"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare size={13} className="text-accent-400" />
                {team.update_count} {team.update_count === 1 ? "update" : "updates"}
              </span>
              {team.updated_at ? (
                <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
                  <span className="h-1 w-1 rounded-full bg-ink-600" />
                  Updated {formatDistanceToNow(new Date(team.updated_at))}
                </span>
              ) : team.created_at ? (
                <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
                  <span className="h-1 w-1 rounded-full bg-ink-600" />
                  Created {formatDistanceToNow(new Date(team.created_at))}
                </span>
              ) : null}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-accent-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
              View Team
              <ArrowUpRight size={14} />
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
