"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSavePost } from "@/actions/interactions.actions";
import { useTranslation } from "@/components/translation/translation-provider";

interface SaveButtonProps {
  postId: string;
  initialSaved: boolean;
  currentUserId: string | null;
}

export function SaveButton({ postId, initialSaved, currentUserId }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();

  const handleClick = () => {
    if (!currentUserId || isPending) return;
    setSaved((v) => !v);

    startTransition(async () => {
      const result = await toggleSavePost(postId);
      if (!result) return;
      if ("error" in result) {
        setSaved((v) => !v);
      } else {
        setSaved(result.saved);
      }
    });
  };

  return (
    <button
      type="button"
      disabled={!currentUserId || isPending}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? t("feed.unsave") : t("feed.save")}
      title={saved ? t("feed.unsave") : t("feed.save")}
      className={cn(
        "flex items-center gap-1.5 rounded-full text-xs transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
        saved
          ? "text-accent-400 hover:text-accent-300"
          : "text-ink-600 hover:text-ink-200",
      )}
    >
      <Bookmark
        size={14}
        className={cn(
          "transition-all duration-300 ease-premium",
          saved && "fill-accent-400",
          isPending && "opacity-50",
        )}
      />
      <span className="hidden sm:inline">{saved ? t("feed.saved") : t("feed.save")}</span>
    </button>
  );
}
