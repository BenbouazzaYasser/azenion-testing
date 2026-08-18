"use client";

import { Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallKind } from "@/lib/call";

interface CallButtonsProps {
  disabled?: boolean;
  onStart: (kind: CallKind) => void;
}

/**
 * Header controls that start a voice or video call with the other
 * participant. Only rendered when both users can already access the
 * conversation (handled by the parent).
 */
export function CallButtons({ disabled = false, onStart }: CallButtonsProps) {
  const base =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";
  const baseState =
    "border-border-strong/[0.14] bg-surface/70 text-ink-300 hover:scale-105 hover:border-accent-400/50 hover:bg-accent/[0.08] hover:text-accent-300 hover:shadow-glow-sm active:scale-[0.97]";
  const disabledState = "pointer-events-none border-border-strong/[0.08] text-ink-700";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onStart("audio")}
        disabled={disabled}
        aria-label="Start voice call"
        title="Voice call"
        className={cn(base, disabled ? disabledState : baseState)}
      >
        <Phone size={17} />
      </button>
      <button
        type="button"
        onClick={() => onStart("video")}
        disabled={disabled}
        aria-label="Start video call"
        title="Video call"
        className={cn(base, disabled ? disabledState : baseState)}
      >
        <Video size={18} />
      </button>
    </div>
  );
}
