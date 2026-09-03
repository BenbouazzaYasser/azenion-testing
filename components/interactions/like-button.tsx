"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";

interface LikeButtonProps {
  initialCount: number;
  initialLiked: boolean;
  currentUserId: string | null;
  onToggle: () => Promise<{ liked: boolean; count: number } | { error: string }>;
}

export function LikeButton({
  initialCount,
  initialLiked,
  currentUserId,
  onToggle,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();

  const handleClick = () => {
    if (!currentUserId || isPending) return;
    const prevLiked = liked;
    setLiked((v) => !v);
    setCount((c) => (prevLiked ? c - 1 : c + 1));

    startTransition(async () => {
      const result = await onToggle();
      if (!result) return;
      if ("error" in result) {
        setLiked((v) => !v);
        setCount((c) => (prevLiked ? c + 1 : c - 1));
      } else {
        setLiked(result.liked);
        setCount(result.count);
      }
    });
  };

  return (
    <button
      type="button"
      disabled={!currentUserId || isPending}
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? t("feed.unlike") : t("feed.like")}
      title={liked ? t("feed.unlike") : t("feed.like")}
      className={cn(
        "flex items-center gap-1.5 rounded-full text-xs transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
        liked
          ? "text-red-400 hover:text-red-300"
          : "text-ink-600 hover:text-ink-200",
      )}
    >
      <Heart
        size={14}
        className={cn(
          "transition-all duration-300 ease-premium",
          liked && "fill-red-400",
          isPending && "opacity-50",
        )}
      />
      <span>{count}</span>
    </button>
  );
}
