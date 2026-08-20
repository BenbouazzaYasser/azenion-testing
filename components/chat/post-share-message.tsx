"use client";

import Link from "next/link";
import { Share2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostShareMetadata } from "@/data/chat";

interface PostShareMessageProps {
  metadata: PostShareMetadata | null;
  message: string;
  isOwn: boolean;
}

export function PostShareMessage({ metadata, message, isOwn }: PostShareMessageProps) {
  const permalink = metadata?.post_id ? `/feed/post/${metadata.post_id}` : null;
  const title = metadata?.title?.trim();
  const excerpt = metadata?.excerpt?.trim();
  const image = metadata?.image?.trim();
  const author = metadata?.author;

  const cardBody = (
    <>
      {image && (
        <img
          src={image}
          alt=""
          className="h-40 w-full border-b border-border-strong/40 object-cover"
        />
      )}
      <div className="space-y-1.5 p-3">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-300">
            <Share2 size={11} />
            Shared a post
          </span>
          {metadata?.source_type ? (
            <span className="ml-auto truncate rounded-full border border-border-strong/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-ink-500">
              {metadata.source_type}
            </span>
          ) : null}
        </div>
        {title ? (
          <p className="line-clamp-2 text-sm font-semibold text-ink-50">{title}</p>
        ) : null}
        {excerpt ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-400">{excerpt}</p>
        ) : null}
        {author?.username ? (
          <p className="flex items-center gap-1 pt-0.5 text-[11px] text-ink-500">
            {author.full_name ?? author.username}
            {author.full_name ? <span className="text-ink-600">@{author.username}</span> : null}
          </p>
        ) : null}
      </div>
    </>
  );

  const card = (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface backdrop-blur-xl transition-colors duration-200",
        permalink
          ? "border-border-strong/70 "
          : "border-border-strong/40",
      )}
    >
      {cardBody}
    </div>
  );

  return (
    <div className={cn("space-y-1.5", isOwn ? "items-end" : "items-start")}>
      {message && (
        <p className="whitespace-pre-wrap break-words px-1 text-sm leading-relaxed text-ink-50">
          {message}
        </p>
      )}
      {permalink ? (
        <Link
          href={permalink}
          aria-label={`Open shared post${title ? `: ${title}` : ""}`}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
        >
          {card}
        </Link>
      ) : (
        <div aria-label="Shared a post" className="block rounded-xl">
          <div className="overflow-hidden rounded-xl border border-border-strong/40 bg-surface/70">
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface text-ink-400">
                <FileText size={16} />
              </span>
              <span className="text-xs font-medium text-ink-300">
                Shared a post
              </span>
              {message ? (
                <span className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-500">
                  {message}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}