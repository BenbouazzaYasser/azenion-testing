"use client";

import { useTransition, useState } from "react";
import { Users, Plus, LogOut, User, Lock, Eye, UserPlus, Globe, Building2 } from "lucide-react";
import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundAtmosphere } from "@/components/graphics/background-atmosphere";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { joinProject, leaveProject } from "@/actions/project.actions";
import { OwnershipLeaveModal } from "@/components/shared/ownership-leave-modal";
import type { RecruitmentRole } from "./recruitment-editor";
import { ProjectSettingsDialog } from "./project-settings-dialog";
import Link from "next/link";

interface MemberInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
}

interface ProjectPageHeroProps {
  project: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    description_long: string | null;
    logo_url: string | null;
    visibility: string;
    member_count: number;
    team: { name: string; slug: string } | null;
    owner: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
    website: string | null;
    github_url: string | null;
    technologies: string[];
    recruitment: RecruitmentRole[];
    categories: { id: string; name: string; slug: string }[];
    branch: { id: string; name: string; slug: string } | null;
  };
  isMember: boolean;
  currentUserId: string | null;
  userRole: string | null;
  members: MemberInfo[];
  allCategories: { id: string; name: string; slug: string }[];
}

const VISIBILITY_CONFIG: Record<string, { icon: typeof Lock; label: string; class: string }> = {
  open: { icon: Globe, label: "Open", class: "border-accent/25 bg-accent/[0.08] text-accent-300" },
  private: { icon: Lock, label: "Private", class: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300" },
  invite_only: { icon: UserPlus, label: "Invite only", class: "border-purple-400/25 bg-purple-400/[0.08] text-purple-300" },
};

export function ProjectPageHero({ project, isMember, currentUserId, userRole, members, allCategories }: ProjectPageHeroProps) {
  const [isPending, startTransition] = useTransition();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isOwner = currentUserId === project.owner?.id;
  const visConfig = VISIBILITY_CONFIG[project.visibility] ?? VISIBILITY_CONFIG.open!;
  const VisIcon = visConfig.icon;

  function handleJoinLeave() {
    if (isMember && isOwner) {
      setShowLeaveModal(true);
      return;
    }

    startTransition(async () => {
      if (isMember) {
        await leaveProject(project.id, project.slug);
      } else {
        await joinProject(project.id);
      }
    });
  }

  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <AmbientBg />
      <BackgroundInfinity variant="projects" />
      <BackgroundAtmosphere />

      <div className="relative mx-auto max-w-[920px] px-5 pb-32 pt-20 text-center sm:px-8 sm:pt-24 lg:pb-44 lg:pt-32">
        <Reveal delay={0}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] bg-white/[0.03] border-border-strong text-ink-400">
              <span className={`flex h-2 w-2 rounded-full ${visConfig.class.split(" ")[0]}`} />
              <VisIcon size={12} />
              {visConfig.label}
            </div>
            {project.branch ? (
              <Link
                href={`/branches/${project.branch.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium text-accent-300 transition-colors hover:bg-accent/[0.14]"
              >
                <Building2 size={12} />
                {project.branch.name} • Azenion
              </Link>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 flex items-center justify-center gap-4">
            {project.logo_url ? (
              <img src={project.logo_url} alt="" className="h-16 w-16 rounded-2xl border border-accent-400/30 object-cover" />
            ) : null}
            <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
              {project.name}
            </h1>
          </div>
        </Reveal>

        {project.description ? (
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
              {project.description}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-ink-400">
            {project.team ? (
              <Link
                href={`/teams/${project.team.slug}`}
                className="inline-flex items-center gap-1.5 text-accent-400 transition-colors hover:text-accent-300"
              >
                <Users size={14} />
                {project.team.name}
              </Link>
            ) : null}
            {project.team ? <span className="hidden text-ink-600 sm:inline">·</span> : null}
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-accent-400" />
              {project.member_count} {project.member_count === 1 ? "member" : "members"}
            </span>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex items-center justify-center gap-4">
            {currentUserId ? (
              <>
                <Button size="lg" onClick={handleJoinLeave} variant={isMember ? "secondary" : "primary"} disabled={isPending}>
                  {isPending ? (
                    <span>{isMember ? "Leaving..." : "Joining..."}</span>
                  ) : isMember ? (
                    <>
                      <LogOut size={16} />
                      Leave
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Join
                    </>
                  )}
                </Button>
                {isOwner ? (
                  <ProjectSettingsDialog
                    allCategories={allCategories}
                    project={{
                      id: project.id,
                      slug: project.slug,
                      name: project.name,
                      description: project.description,
                      description_long: project.description_long,
                      logo_url: project.logo_url,
                      visibility: project.visibility,
                      website: project.website,
                      github_url: project.github_url,
                      technologies: project.technologies,
                      recruitment: project.recruitment,
                      category_ids: project.categories.map((c) => c.id),
                      team: project.team,
                    }}
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    currentUserId={currentUserId}
                    members={members}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-20 hidden items-center justify-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
              Scroll to explore
            </span>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-1/2 h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <OwnershipLeaveModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        type="project"
        onGoToSettings={() => setSettingsOpen(true)}
      />
    </section>
  );
}
