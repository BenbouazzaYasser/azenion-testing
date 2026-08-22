"use client";

import { useState } from "react";
import { Calendar, GitBranch, MapPin, ShieldCheck, Users } from "lucide-react";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Reveal } from "@/components/ui/reveal";
import { BranchJoinButton } from "./branch-join-button";
import { BranchSettingsDialog } from "./branch-settings-dialog";
import { formatDate } from "@/lib/date";

interface LeaderProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface BranchHeroProps {
  branch: {
    id: string;
    slug: string;
    name: string;
    full_name: string | null;
    description: string | null;
    city: string | null;
    logo_url: string | null;
    created_at: string | null;
    memberCount: number;
  };
  isMember: boolean;
  isBranchLeader: boolean;
  isPlatformAdmin: boolean;
  currentUserId: string | null;
  leaderProfiles: LeaderProfile[];
}

export function BranchPageHero({
  branch,
  isMember,
  isBranchLeader,
  isPlatformAdmin,
  leaderProfiles,
}: BranchHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canManage = isPlatformAdmin || isBranchLeader;

  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      {branch.logo_url ? (
        <div className="absolute inset-0">
          <img
            src={branch.logo_url}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="branch-hero-scrim absolute inset-0 backdrop-blur-sm" />
        </div>
      ) : null}
      <BackgroundInfinity variant="teams" />

      <div className="relative mx-auto max-w-[920px] px-5 pb-28 pt-16 text-center sm:px-8 sm:pt-20 lg:pb-36 lg:pt-24">
        <Reveal delay={0}>
          <div className="mb-9 flex justify-center sm:mb-10">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2.25rem] bg-accent/10 blur-2xl" />
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border branch-hero-frame shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_20px_60px_-20px_rgba(40,40,255,0.35)] backdrop-blur-xl sm:h-28 sm:w-28 sm:rounded-[2rem] lg:h-32 lg:w-32">
                {branch.logo_url ? (
                  <img
                    src={branch.logo_url}
                    alt={`${branch.name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <GitBranch className="h-12 w-12 text-accent-400 sm:h-14 sm:w-14" />
                )}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              <span className="flex h-2 w-2 rounded-full bg-accent-400" />
              Active Branch
            </div>
            {isBranchLeader ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[12px] font-medium text-emerald-300">
                <ShieldCheck size={12} />
                Branch Leader
              </span>
            ) : null}
            {branch.city ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/[0.08] bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-400">
                <MapPin size={12} className="text-accent-400" />
                {branch.city}
              </span>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
            {branch.name}
          </h1>
        </Reveal>

        {branch.full_name ? (
          <Reveal delay={140}>
            <p className="mt-2 text-base font-medium text-accent-300/90">{branch.full_name}</p>
          </Reveal>
        ) : null}

        {branch.description ? (
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
              {branch.description}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={200}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-accent-400" />
              {branch.memberCount} {branch.memberCount === 1 ? "member" : "members"}
            </span>
            {branch.created_at ? (
              <>
                <span className="hidden text-ink-600 sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-accent-400" />
                  Founded {formatDate(branch.created_at)}
                </span>
              </>
            ) : null}
          </div>
        </Reveal>

        {leaderProfiles.length > 0 ? (
          <Reveal delay={220}>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {leaderProfiles.slice(0, 5).map((m) =>
                  m.avatar_url ? (
                    <img
                      key={m.id}
                      src={m.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full border border-void-950 object-cover"
                    />
                  ) : (
                    <span
                      key={m.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-void-950 bg-gradient-to-br from-accent-500 to-accent-400 text-xs font-semibold text-white"
                    >
                      {(m.full_name?.[0] || m.username?.[0] || "L").toUpperCase()}
                    </span>
                  )
                )}
              </div>
              <span className="text-xs text-ink-400">
                Led by {leaderProfiles.slice(0, 3).map((m) => m.full_name || `@${m.username}`).join(", ")}
                {leaderProfiles.length > 3 ? ` +${leaderProfiles.length - 3}` : ""}
              </span>
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={240}>
          <div className="mt-8 flex flex-wrap items-start justify-center gap-4">
            <BranchJoinButton
              branchId={branch.id}
              isMember={isMember}
              label={isMember ? "Your Branch" : "Join Branch"}
              cosmic
              helperText={
                isMember
                  ? "You are a member of this branch."
                  : "Joining a branch connects you with its community."
              }
            />
            {canManage ? (
              <BranchSettingsDialog
                branch={branch}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                isPlatformAdmin={isPlatformAdmin}
                canEditLogo={isPlatformAdmin || isBranchLeader}
              />
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-14 hidden items-center justify-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-border-strong/[0.08] p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
              Scroll to explore
            </span>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-1/2 h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </section>
  );
}
