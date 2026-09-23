"use client";

import { Film, Loader2, RefreshCw, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingPost, UploadStatus } from "@/components/feed/optimistic-posts";

interface PendingFeedCardProps {
  post: PendingPost;
  uploadStatus: UploadStatus | null;
  onRetry: (tmpId: string) => void;
  onDismiss: (tmpId: string) => void;
}

/**
 * Renders an optimistic user post while it is being created (blob preview
 * URLs — these must NOT go through next/image, they are local-only). Once
 * the server item resolves, FeedList swaps this for a real FeedCard.
 */
export function PendingFeedCard({ post, uploadStatus, onRetry, onDismiss }: PendingFeedCardProps) {
  const { item } = post;
  const uploading = post.status === "posting";
  const uploadingThis =
    uploading && uploadStatus?.tmpId === post.tmpId && uploadStatus.total > 1;

  const mediaCount = item.images.length + item.videos.length;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl card-surface-soft p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium sm:p-6",
        post.status === "failed" && "border-rose-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0">
            {item.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.author_avatar}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-400 text-sm font-semibold text-white">
                {item.author_name?.[0]?.toUpperCase() ?? <User size={16} />}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-50">
              {item.author_name ?? "You"}
            </p>
            {item.author_username ? (
              <p className="truncate text-xs text-ink-500">@{item.author_username}</p>
            ) : null}
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
          {post.status === "failed" ? (
            <span className="text-rose-400">Post failed</span>
          ) : uploading && uploadStatus?.tmpId === post.tmpId ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              {uploadStatus.total > 1
                ? `Uploading ${uploadStatus.index}/${uploadStatus.total}`
                : "Uploading media"}
            </>
          ) : (
            <>
              <Loader2 size={11} className="animate-spin" />
              Posting…
            </>
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-200">
          <User size={11} />
          Post
        </span>
      </div>

      {item.title ? (
        <h3 className="mt-3 break-words text-[1.05rem] font-semibold leading-snug text-ink-50 [overflow-wrap:anywhere]">
          {item.title}
        </h3>
      ) : null}

      {item.body ? (
        <p className="mt-2 break-words text-sm leading-relaxed text-ink-400 line-clamp-3 [overflow-wrap:anywhere]">
          {item.body}
        </p>
      ) : null}

      {mediaCount > 0 ? (
        <div
          className={cn(
            "mt-4 grid gap-2",
            mediaCount === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {item.images.map((src, i) => (
            <div
              key={`img-${i}`}
              className={cn(
                "relative overflow-hidden rounded-xl bg-surface",
                mediaCount === 1 ? "aspect-[16/10]" : "aspect-[4/3]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {item.videos.map((src, i) => (
            <div
              key={`vid-${i}`}
              className={cn(
                "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-black/40",
                mediaCount === 1 && "aspect-[16/10]",
              )}
            >
              <Film size={22} className="text-ink-400" />
              <video src={src} muted playsInline preload="metadata" className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      ) : null}

      {uploadingThis ? (
        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent transition-[width] duration-300 ease-premium"
            style={{
              width: `${Math.max(0, ((uploadStatus!.index - 1) / uploadStatus!.total) * 100)}%`,
            }}
          />
        </div>
      ) : null}

      {post.status === "failed" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-rose-400">{post.error ?? "Post failed"}</p>
          <button
            type="button"
            onClick={() => onRetry(post.tmpId)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-all duration-300 hover:bg-accent-glow"
          >
            <RefreshCw size={13} />
            Retry
          </button>
          <button
            type="button"
            onClick={() => onDismiss(post.tmpId)}
            aria-label="Dismiss failed post"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs text-ink-400 transition-colors hover:text-ink-200"
          >
            <X size={13} />
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}