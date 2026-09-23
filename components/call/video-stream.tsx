"use client";

import { useCallback, useEffect, useRef } from "react";

interface VideoStreamProps {
  stream: MediaStream | null | undefined;
  muted?: boolean;
  playsInline?: boolean;
  /** Render an <audio> element (voice calls): plays while hidden, unlike video. */
  audioOnly?: boolean;
  className?: string;
}

/**
 * Renders a <video> (or <audio> when audioOnly) element and keeps its
 * srcObject in sync with the given MediaStream. `muted` is required for the
 * local preview so the browser's autoplay policy does not block it.
 *
 * Remote playback is best-effort across browsers: play() can reject when no
 * user gesture has registered yet, so playback is retried when tracks arrive
 * and on the next pointer interaction instead of failing silently once.
 */
export function VideoStream({
  stream,
  muted = true,
  playsInline = true,
  audioOnly = false,
  className,
}: VideoStreamProps) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const setRef = useCallback((el: HTMLVideoElement | HTMLAudioElement | null) => {
    ref.current = el;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Set via property: React's muted attribute is unreliable on media els.
    el.muted = muted;
    if (el.srcObject !== stream) {
      el.srcObject = stream ?? null;
    }
    if (!stream) return;
    let disposed = false;
    const tryPlay = () => {
      if (!disposed) void el.play().catch(() => {});
    };
    tryPlay();
    const onAddTrack = () => tryPlay();
    stream.addEventListener("addtrack", onAddTrack);
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("touchend", tryPlay);
    return () => {
      disposed = true;
      stream.removeEventListener("addtrack", onAddTrack);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("touchend", tryPlay);
    };
  }, [stream, muted]);

  if (audioOnly) {
    return <audio ref={setRef} className={className} autoPlay playsInline />;
  }

  return (
    <video
      ref={setRef}
      className={className}
      autoPlay
      playsInline
      muted={muted}
      aria-hidden={muted}
    />
  );
}
