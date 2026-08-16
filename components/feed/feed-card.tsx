"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bookmark,
  Calendar,
  GitBranch,
  Globe,
  Heart,
  Link2,
  MapPin,
  Pin,
  Rocket,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, formatShortDate, formatTime } from "@/lib/date";
import { ImageGallery } from "@/components/feed/image-gallery";
import { VideoGallery } from "@/components/feed/video-gallery";
import { LikeButton } from "@/components/interactions/like-button";
import { CommentSection } from "@/components/interactions/comment-section";
import { SharePostButton } from "@/components/feed/share-post-button";
import { toggleLike } from "@/actions/interactions.actions";
import type { FeedItemWithAuthor } from "@/actions/feed.actions";

const INTERACTIONLESS_TYPES = new Set<FeedItemWithAuthor["source_type"]>([
  "branch_highlight",
  "branch_event",
]);

const ENTITY_CONFIG = {
  TEAM: {
    icon: Users,
    label: "Team",
    color: "text-accent-300",
    bg: "bg-accent/[0.06]",
  },
  PROJECT: {
    icon: Rocket,
    label: "Project",
    color: "text-accent-400",
    bg: "bg-accent/[0.08]",
  },
  BRANCH: {
    icon: GitBranch,
    label: "Branch",
    color: "text-emerald-300",
    bg: "bg-emerald-500/[0.08]",
  },
  POST: {
    icon: User,
    label: "Post",
    color: "text-ink-200",
    bg: "bg-surface",
  },
} as const;

type EntityType = keyof typeof ENTITY_CONFIG;

const SOURCE_TO_ENTITY: Record<FeedItemWithAuthor["source_type"], EntityType> = {
  project_update: "PROJECT",
  team_update: "TEAM",
  branch_announcement: "BRANCH",
  branch_highlight: "BRANCH",
  branch_event: "BRANCH",
  user_post: "POST",
};

function entityTypeFor(item: FeedItemWithAuthor): EntityType {
  return item.entity_type ?? SOURCE_TO_ENTITY[item.source_type];
}

function initialFor(name: string | null | undefined): string {
  return name?.trim()?.[0]?.toUpperCase() ?? "A";
}

function likedByText(item: FeedItemWithAuthor): string | null {
  const names = item.liked_by_names ?? [];
  if (names.length === 0) return null;
  if (names.length === 1) return `Liked by ${names[0]}`;
  if (names.length === 2) return `Liked by ${names[0]} and ${names[1]}`;
  const others = Math.max(0, item.like_count - 1);
  return `Liked by ${names[0]} and ${others} ${others === 1 ? "other" : "others"}`;
}

function getEventStatus(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): "upcoming" | "live" | "completed" {
  if (!startsAt) return "upcoming";
  const now = Date.now();
  if (now < new Date(startsAt).getTime()) return "upcoming";
  if (endsAt && now >= new Date(endsAt).getTime()) return "completed";
  return "live";
}

function eventScheduleText(item: FeedItemWithAuthor): string | null {
  if (item.event_schedule) return item.event_schedule;
  if (item.event_starts_at) {
    const end = item.event_ends_at ? ` \u2013 ${formatTime(item.event_ends_at)}` : "";
    return `${formatShortDate(item.event_starts_at)} \u2022 ${formatTime(item.event_starts_at)}${end}`;
  }
  return null;
}

interface FeedCardProps {
  item: FeedItemWithAuthor;
  currentUserId: string | null;
  headerAction?: ReactNode;
  postMenu?: ReactNode;
}

export function FeedCard({ item, currentUserId, headerAction, postMenu }: FeedCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const entityType = entityTypeFor(item);
  const config = ENTITY_CONFIG[entityType];
  const EntityIcon = config.icon;

  const noInteractions = INTERACTIONLESS_TYPES.has(item.source_type);
  const isBranch = entityType === "BRANCH";
  const isEvent = item.source_type === "branch_event";
  const isHighlight = item.source_type === "branch_highlight";

  const entityName = item.entity_name ?? item.author_name ?? "Azenion";
  const avatarSrc = item.entity_logo_url ?? item.author_avatar;
  const showAuthor = Boolean(item.author_name) && entityType !== "POST";

  const timeAgo = item.created_at && mounted ? formatDistanceToNow(new Date(item.created_at)) : "";
  const likedBy = likedByText(item);

  const eventStatus = isEvent
    ? getEventStatus(item.event_starts_at, item.event_ends_at)
    : null;
  const schedule = isEvent ? eventScheduleText(item) : null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong card-surface-soft p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-accent-400/30 hover:shadow-glow-sm sm:p-6">
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className={cn("relative", postMenu && "pr-9")}>
        {postMenu ? (
          <div className="absolute right-0 top-0 z-20">{postMenu}</div>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-10 w-10 rounded-full border border-border-strong/[0.12] object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-400 text-sm font-semibold text-white">
                  {isBranch ? <GitBranch size={16} /> : initialFor(entityName)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-50">{entityName}</p>
              {showAuthor ? (
                <p className="truncate text-xs text-ink-500">
                  {item.author_name}
                  {item.author_username ? ` @${item.author_username}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          {(headerAction || item.event_visibility) ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerAction}
              {item.event_visibility ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1 text-[11px] font-medium text-ink-400">
                  {item.event_visibility === "public" ? <Globe size={11} /> : <Users size={11} />}
                  {item.event_visibility === "public" ? "Public" : "Members"}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              config.bg,
              config.color,
            )}
          >
            <EntityIcon size={11} />
            {config.label}
          </span>

          {isEvent && eventStatus === "live" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          ) : isEvent && eventStatus === "completed" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-ink-700/50 bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
              Completed
            </span>
          ) : null}

          {item.is_pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-accent-300">
              <Pin size={10} />
              Pinned
            </span>
          ) : null}

          {timeAgo ? <span className="text-[11px] text-ink-600">{timeAgo}</span> : null}
        </div>

        {showAuthor ? (
          <div className="mt-3 flex items-center gap-2">
            {item.author_avatar ? (
              <img
                src={item.author_avatar}
                alt=""
                className="h-5 w-5 rounded-full border border-border-strong/[0.1] object-cover"
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink-400">
                {initialFor(item.author_name)}
              </span>
            )}
            <span className="text-xs text-ink-400">
              Posted by {item.author_name}
              {item.author_username ? ` @${item.author_username}` : ""}
            </span>
          </div>
        ) : null}

        {item.title ? (
          <h3 className="mt-3 text-[1.05rem] font-semibold leading-snug text-ink-50">
            {item.title}
          </h3>
        ) : null}

        {item.body ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-400 line-clamp-3">
            {item.body}
          </p>
        ) : null}

        {isEvent && schedule ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-accent-400" />
              {schedule}
            </span>
          </div>
        ) : null}

        {isEvent && item.event_location ? (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-400">
            <MapPin size={13} className="text-accent-400" />
            {item.event_location}
          </div>
        ) : null}

        {isEvent && item.event_registration_url ? (
          <a
            href={item.event_registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400 transition-colors hover:text-accent-300"
          >
            <Link2 size={13} />
            Register
          </a>
        ) : null}

        {item.images.length > 0 ? (
          <div className="mt-4">
            <ImageGallery images={item.images} />
          </div>
        ) : null}

        {item.videos.length > 0 ? (
          <div className="mt-4">
            <VideoGallery videos={item.videos} />
          </div>
        ) : null}

        {isHighlight && item.link_url ? (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-400 transition-colors hover:text-accent-300"
          >
            Learn more
            <Link2 size={12} />
          </a>
        ) : null}

        {!noInteractions && likedBy ? (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-500">
            <Heart size={12} className="shrink-0 fill-red-400 text-red-400" />
            <span>{likedBy}</span>
          </div>
        ) : null}

        {!noInteractions ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-border-strong/50 pt-3">
            <div className="flex min-w-0 items-start gap-4">
              <LikeButton
                initialCount={item.like_count}
                initialLiked={item.user_has_liked}
                currentUserId={currentUserId}
                onToggle={() => toggleLike(item.source_type, item.source_id ?? "")}
              />

              <CommentSection
                targetType={item.source_type}
                targetId={item.source_id ?? ""}
                initialCount={item.comment_count}
                currentUserId={currentUserId}
              />
            </div>

            <div className="flex min-w-0 items-center gap-4">
              <SharePostButton postId={item.id} currentUserId={currentUserId} />
              <button
                type="button"
                disabled
                title="Coming Soon"
                className="flex items-center gap-1.5 text-xs text-ink-600 transition-colors duration-300 ease-premium hover:text-ink-200 disabled:pointer-events-none disabled:opacity-50"
              >
                <Bookmark size={14} />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
