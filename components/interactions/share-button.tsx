"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/translation/translation-provider";

type ShareStatus = "idle" | "copied" | "failed";

interface ShareButtonProps {
  postId: string;
}

export function ShareButton({ postId }: ShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback((delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus("idle"), delay);
  }, []);

  const handleShare = async () => {
    if (status === "copied") return;

    const permalink = `/feed/post/${postId}`;

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(permalink);
      setStatus("copied");
      reset(2000);
    } catch {
      setStatus("failed");
      reset(2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={status === "copied" ? t("feed.linkCopied") : t("feed.share")}
      title={status === "copied" ? t("feed.copied") : t("feed.share")}
      className={cn(
        "flex items-center gap-1.5 rounded-full text-xs transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
        status === "copied"
          ? "text-accent-400 hover:text-accent-300"
          : status === "failed"
            ? "text-red-400 hover:text-red-300"
            : "text-ink-600 hover:text-ink-200",
      )}
    >
      {status === "copied" ? (
        <Check size={14} />
      ) : (
        <Share2 size={14} />
      )}
      <span className="hidden sm:inline">
        {status === "copied"
          ? t("feed.copied")
          : status === "failed"
            ? t("feed.copyFailed")
            : t("feed.share")}
      </span>
    </button>
  );
}
