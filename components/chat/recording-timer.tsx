"use client";

import { useEffect, useState } from "react";
import { CHAT_MAX_AUDIO_DURATION_SECONDS } from "@/lib/chat-media";

/**
 * Live elapsed/max counter for voice recording. Kept as its own component so
 * the 500ms tick re-renders only this node instead of the whole chat tree.
 */
export function RecordingTimer({ startedAt }: { startedAt: number | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <span className="min-w-0 flex-1 text-sm font-medium tabular-nums text-ink-50">
      {fmt(elapsed)} / {fmt(CHAT_MAX_AUDIO_DURATION_SECONDS)}
    </span>
  );
}
