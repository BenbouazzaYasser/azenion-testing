"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface VideoMediaProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showDuration?: boolean;
}

export function VideoMedia({
  src,
  className,
  autoPlay = false,
  loop = false,
  showDuration = true,
}: VideoMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    setMetadataReady(true);
    if (Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
  }

  const durationLabel = duration !== null ? formatVideoDuration(duration) : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-black/40", className)}
    >
      {inView ? (
        <video
          src={src}
          controls
          muted
          autoPlay={autoPlay}
          loop={loop}
          preload="metadata"
          playsInline
          controlsList="nodownload"
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setPlayError(false)}
          onError={() => setPlayError(true)}
          className="h-full w-full object-contain"
        >
          Your browser doesn&apos;t support playing this video format.
        </video>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
            <Play size={18} className="ml-0.5" fill="currentColor" />
          </span>
        </div>
      )}

      {inView && !metadataReady && !playError ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
            <Play size={18} className="ml-0.5" fill="currentColor" />
          </span>
        </div>
      ) : null}

      {playError ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/50 px-4 text-center">
          <Film size={16} className="shrink-0 text-ink-300" />
          <span className="text-xs font-medium text-ink-200">
            This video format isn&apos;t supported by your browser.
          </span>
        </div>
      ) : null}

      {showDuration && durationLabel && !playError ? (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {durationLabel}
        </span>
      ) : null}
    </div>
  );
}
