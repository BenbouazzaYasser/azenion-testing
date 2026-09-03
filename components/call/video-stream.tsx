"use client";

import { useEffect, useRef } from "react";

interface VideoStreamProps {
  stream: MediaStream | null | undefined;
  muted?: boolean;
  playsInline?: boolean;
  className?: string;
}

/**
 * Renders a <video> element and keeps its srcObject in sync with the given
 * MediaStream. `muted` is required for the local preview so the browser's
 * autoplay policy does not block it.
 */
export function VideoStream({
  stream,
  muted = true,
  playsInline = true,
  className,
}: VideoStreamProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream ?? null;
    }
    if (stream) void el.play().catch(() => {});
  }, [stream]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      playsInline
      muted={muted}
      aria-hidden={muted}
    />
  );
}
