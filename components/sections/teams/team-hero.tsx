"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Users, Calendar, User, Building2, Settings, Clock, Archive } from "lucide-react";
import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Reveal } from "@/components/ui/reveal";
import { TeamJoinButton, type TeamRequestStatus } from "./team-join-button";
import { TeamCategoryBadge } from "./team-category-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { getTeamStatus, isTeamHidden } from "@/lib/lifecycle";
import { reactivateTeam } from "@/actions/team.actions";
import Link from "next/link";
import { useTranslation } from "@/components/translation/translation-provider";

interface TeamHeroProps {
  team: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    visibility: string;
    status?: string | null;
    last_activity_at?: string | null;
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
  requestStatus?: TeamRequestStatus;
  categories: { id: string; name: string; slug: string }[];
}

export function TeamHero({ team, isMember, currentUserId, requestStatus, categories }: TeamHeroProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const isOwner = currentUserId === team.owner.id;
  const visibleCats = team.categories.slice(0, 3);
  const catOverflow = team.categories.length - visibleCats.length;
  const inactive = getTeamStatus(team.last_activity_at) === "inactive";
  const hidden = isTeamHidden(team.last_activity_at);

  function handleReactivate() {
    const formData = new FormData();
    formData.set("team_id", team.id);
    formData.set("slug", team.slug);
    startTransition(async () => {
      await reactivateTeam(formData);
    });
  }

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
      <BackgroundInfinity variant="teams" />
      <AmbientBg />

      <div className="relative mx-auto max-w-[920px] px-5 pb-28 pt-16 text-center sm:px-8 sm:pt-20 lg:pb-36 lg:pt-24">
        <Reveal delay={0}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              <span className="flex h-2 w-2 rounded-full bg-accent-400" />
              {team.visibility === "public" ? t("teams.public") : t("teams.private")}
            </div>
            {team.categories.map((cat) => (
              <TeamCategoryBadge key={cat.id} name={cat.name} />
            ))}
            {catOverflow > 0 ? (
              <span className="inline-flex rounded-full bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink-600 dark:text-white/55">
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

        {inactive || hidden ? (
          <Reveal delay={40}>
            <div className="mt-5 flex flex-col items-center gap-3">
              <div
                className={`inline-flex max-w-xl items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm ${
                  hidden
                    ? "border-red-500/25 bg-red-500/[0.07] text-red-300"
                    : "border-amber-500/25 bg-amber-500/[0.07] text-amber-300"
                }`}
              >
                {hidden ? (
                  <>
                    <Archive size={15} className="shrink-0" />
                    <span>
                      {t("teams.heroHidden")}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock size={15} className="shrink-0" />
                    <span>
                      {t("teams.heroInactive")}
                    </span>
                  </>
                )}
              </div>
              {isOwner ? (
                <Button size="sm" variant="secondary" onClick={handleReactivate} disabled={isPending}>
                  {isPending ? t("teams.reactivating") : t("teams.reactivate")}
                </Button>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
            {team.name}
          </h1>
        </Reveal>

        {team.description ? (
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-[1.05rem] leading-relaxed text-ink-500 dark:text-white/60 sm:text-[1.1rem] sm:leading-8">
              {team.description}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={200}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-ink-600 dark:text-white/55">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.03]">
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
            <span className="hidden text-ink-700 dark:text-white/30 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-accent-400" />
              {team.memberCount} {team.memberCount === 1 ? t("teams.memberOne") : t("teams.memberMany")}
            </span>
            {team.created_at ? (
              <>
                <span className="hidden text-ink-700 dark:text-white/30 sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-accent-400" />
                  {t("common.created")} {formatDate(team.created_at)}
                </span>
              </>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 flex items-center justify-center gap-4">
            <TeamJoinButton
              teamId={team.id}
              teamName={team.name}
              teamSlug={team.slug}
              isMember={isMember}
              isOwner={isOwner}
              requestStatus={requestStatus}
              onGoToSettings={() => router.push(`/teams/${team.slug}/settings`)}
            />
            {isMember ? (
              <Link href={`/teams/${team.slug}/settings`}>
                <Button size="lg" variant="secondary">
                  <Settings size={15} />
                  {t("teams.settings")}
                </Button>
              </Link>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-14 hidden items-center justify-center gap-3 sm:flex">
            <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-700 dark:text-white/35">
              {t("common.scrollToExplore")}
            </span>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-1/2 hidden h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent lg:block" />
    </section>
  );
}
