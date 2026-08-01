"use client";

import { useState } from "react";
import { Users, Calendar, User, Tags, Building2 } from "lucide-react";
import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundAtmosphere } from "@/components/graphics/background-atmosphere";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Reveal } from "@/components/ui/reveal";
import { TeamJoinButton } from "./team-join-button";
import { TeamCategoryBadge } from "./team-category-badge";
import { TeamSettingsDialog } from "./team-settings-dialog";
import { formatDate } from "@/lib/date";
import Link from "next/link";

interface MemberInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
}

interface TeamHeroProps {
  team: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    visibility: string;
    created_at: string | null;
    categories: { id: string; name: string; slug: string }[];
    owner: {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
    memberCount: number;
    branch: { id: string; name: string; slug: string } | null;
  };
  isMember: boolean;
  currentUserId: string | null;
  userRole: string | null;
  categories: { id: string; name: string; slug: string }[];
  members: MemberInfo[];
}

export function TeamHero({ team, isMember, currentUserId, userRole, categories, members }: TeamHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isOwner = currentUserId === team.owner.id;
  const canManage = userRole === "owner" || userRole === "admin";
  const visibleCats = team.categories.slice(0, 3);
  const catOverflow = team.categories.length - visibleCats.length;

  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      {team.banner_url ? (
        <div className="absolute inset-0">
          <img
            src={team.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#050507]/70 backdrop-blur-sm" />
        </div>
      ) : null}
      <AmbientBg />
      <BackgroundInfinity variant="teams" />
      <BackgroundAtmosphere />

      <div className="relative mx-auto max-w-[920px] px-5 pb-32 pt-20 text-center sm:px-8 sm:pt-24 lg:pb-44 lg:pt-32">
        <Reveal delay={0}>
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              <span className="flex h-2 w-2 rounded-full bg-accent-400" />
              {team.visibility === "public" ? "Public" : "Private"}
            </div>
            {team.categories.map((cat) => (
              <TeamCategoryBadge key={cat.id} name={cat.name} />
            ))}
            {catOverflow > 0 ? (
              <span className="inline-flex rounded-full border border-ink-700/50 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
                +{catOverflow}
              </span>
            ) : null}
            {team.branch ? (
              <Link
                href={`/branches/${team.branch.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium text-accent-300 transition-colors hover:bg-accent/[0.14]"
              >
                <Building2 size={12} />
                {team.branch.name} • Azenion
              </Link>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-8 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
            {team.name}
          </h1>
        </Reveal>

        {team.description ? (
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
              {team.description}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-ink-400">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong bg-white/[0.03]">
                {team.owner.avatar_url ? (
                  <img
                    src={team.owner.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User size={13} className="text-accent-400" />
                )}
              </div>
              <span>
                {team.owner.full_name || `@${team.owner.username}`}
              </span>
            </div>
            <span className="hidden text-ink-600 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-accent-400" />
              {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
            </span>
            {team.created_at ? (
              <>
                <span className="hidden text-ink-600 sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-accent-400" />
                  Created {formatDate(team.created_at)}
                </span>
              </>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex items-center justify-center gap-4">
            <TeamJoinButton
              teamId={team.id}
              teamSlug={team.slug}
              isMember={isMember}
              isOwner={isOwner}
              onGoToSettings={() => setSettingsOpen(true)}
            />
            {canManage ? (
              <TeamSettingsDialog
                team={{
                  id: team.id,
                  name: team.name,
                  slug: team.slug,
                  description: team.description,
                  logo_url: team.logo_url,
                  visibility: team.visibility,
                  category_ids: team.categories.map((c) => c.id),
                }}
                categories={categories}
                canDelete={isOwner}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                currentUserId={currentUserId}
                members={members}
              />
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
    </section>
  );
}
