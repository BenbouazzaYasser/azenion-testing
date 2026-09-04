"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  User,
  Loader2,
  PhoneCall,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import { VideoStream } from "@/components/call/video-stream";
import type { CallSession, CallKind } from "@/lib/call/types";

interface ActiveCallOverlayProps {
  call: CallSession;
  manager: {
    endCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => Promise<{ error?: string }>;
  };
}

const END_REASON_LABEL: Partial<
  Record<NonNullable<CallSession["endReason"]>, string>
> = {
  declined: "Call declined",
  canceled: "Call canceled",
  busy: "The recipient is already in a call",
  "peer-left": "Call ended",
  timeout: "No answer",
  error: "Call ended",
};

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function CallButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ease-premium",
        "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
        active
          ? "border-accent-400/50 bg-accent text-white shadow-glow"
          : danger
            ? "border-red-400/30 bg-red-500/15 text-red-300 hover:bg-red-500/25"
            : "border-border-strong bg-surface text-ink-200 hover:text-ink-50",
      )}
    >
      {children}
    </button>
  );
}

export function ActiveCallOverlay({ call, manager }: ActiveCallOverlayProps) {
  const isVideo = call.kind === "video";
  const [isMinimized, setIsMinimized] = useState(false);
  // True while a screen-share start/stop is in flight (e.g. while the OS
  // picker is open). Proves the tap registered and something is happening.
  const [sharingBusy, setSharingBusy] = useState(false);
  const now = useNow(call.phase === "active" && !!call.startedAt);
  const durationSec =
    call.startedAt && call.phase === "active" ? Math.max(0, Math.floor((now - call.startedAt) / 1000)) : 0;
  const callConnected =
    call.phase === "active" || call.connectionState === "connected";
  const showRemote = call.remoteStream != null && callConnected;

  // Choose the primary visual: screen share if active, else remote video, else
  // a fallback calling avatar.
  const screenTrackLive =
    call.screenActive && (
      call.screenStream?.getVideoTracks().some((t) => t.readyState === "live") ||
      call.remoteStream?.getVideoTracks().some((t) => t.readyState === "live")
    );

  // Sender sees their own screen stream; receiver sees the remote stream
  // (which now carries the sender's screen video track).
  const screenDisplayStream = call.screenActive
    ? (call.screenStream ?? call.remoteStream)
    : null;

  if (isMinimized) {
    return (
      <div
        role="dialog"
        aria-label="Minimized call"
        className="fixed bottom-6 right-6 z-[120] flex items-center gap-3 rounded-2xl border border-border-strong bg-void-950/90 p-3 shadow-dialog backdrop-blur-2xl animate-fade-in"
      >
        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-void-900">
          {isVideo && call.remoteStream ? (
            <VideoStream stream={call.remoteStream} muted={false} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent/20 text-accent-300">
              {isVideo ? <Video className="h-5 w-5" /> : <PhoneCall className="h-5 w-5" />}
            </div>
          )}
        </div>
        <div className="min-w-0 max-w-[140px]">
          <div className="truncate text-xs font-semibold text-ink-50">
            {call.peer.full_name ?? `@${call.peer.username}`}
          </div>
          <div className="text-[10px] text-ink-400">
            {call.phase === "active" && call.startedAt ? formatClock(durationSec) : "Calling…"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            aria-label="Expand call"
            title="Expand call"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-300 hover:text-ink-50 transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={manager.endCall}
            aria-label="End call"
            title="End call"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
          >
            <PhoneCall className="h-3.5 w-3.5 rotate-[135deg]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Active call"
      className="fixed inset-0 z-[120] flex flex-col bg-void-950/95 backdrop-blur-xl"
    >
      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-50">
            {call.peer.full_name ?? `@${call.peer.username}`}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
            <span className="capitalize">{call.kind === "video" ? "Video call" : "Voice call"}</span>
            <span aria-hidden>·</span>
            {call.phase === "active" && call.startedAt ? (
              <span>{formatClock(durationSec)}</span>
            ) : (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {call.phase === "ringing"
                  ? "Calling…"
                  : call.phase === "connecting"
                    ? "Connecting…"
                    : "Calling…"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Minimize call"
            title="Minimize call"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-300 hover:text-ink-50 transition-all"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative flex-1 min-h-0 px-4 pb-28 sm:px-8">
        {isVideo ? (
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border-strong bg-void-900/60">
            {/* Primary view: screen share or remote video */}
            {screenTrackLive && screenDisplayStream ? (
              <VideoStream
                stream={screenDisplayStream}
                muted={false}
                className="absolute inset-0 h-full w-full object-contain bg-void-950"
              />
            ) : showRemote ? (
              <VideoStream
                stream={call.remoteStream}
                muted={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void-950/40">
                <span className="flex h-24 w-24 items-center justify-center rounded-full border border-accent-400/30 bg-gradient-to-br from-accent to-accent-glow shadow-glow">
                  <User className="h-11 w-11 text-white/90" />
                </span>
                <div className="text-sm text-ink-500">
                  {call.phase === "active"
                    ? "Waiting for video…"
                    : call.phase === "connecting"
                      ? "Connecting…"
                      : call.role === "caller"
                        ? "Ringing…"
                        : "Connecting…"}
                </div>
              </div>
            )}

            {/* Screen-share badge */}
            {call.screenActive && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-void-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-accent-300 backdrop-blur">
                <ScreenShare className="h-3 w-3" />
                Screen sharing
              </div>
            )}

            {/* Local preview */}
            {call.localStream ? (
              <div className="absolute right-3 top-3 h-28 w-40 overflow-hidden rounded-2xl border border-border-strong bg-void-900 shadow-dialog max-sm:h-24 max-sm:w-32">
                <VideoStream
                  stream={call.localStream}
                  muted
                  className={cn(
                    "h-full w-full object-cover",
                    call.cameraOff && "opacity-0",
                  )}
                />
                {call.cameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-void-900">
                    <VideoOff className="h-6 w-6 text-ink-500" />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* Voice call layout */
          <>
            {call.remoteStream && (
              <VideoStream stream={call.remoteStream} muted={false} className="hidden" />
            )}
            {screenTrackLive && screenDisplayStream ? (
              <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border-strong bg-void-900/60">
                <VideoStream
                  stream={screenDisplayStream}
                  muted={false}
                  className="absolute inset-0 h-full w-full object-contain bg-void-950"
                />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-void-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-accent-300 backdrop-blur">
                  <ScreenShare className="h-3 w-3" />
                  Screen sharing
                </div>
                <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full border border-border-strong bg-void-950/70 px-3 py-1.5 text-xs text-ink-200 backdrop-blur">
                  <span className="truncate">{call.peer.full_name ?? `@${call.peer.username}`}</span>
                  <span aria-hidden className="text-ink-500">·</span>
                  <span>{formatClock(durationSec)}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="flex h-28 w-28 items-center justify-center rounded-full border border-accent-400/30 bg-gradient-to-br from-accent to-accent-glow shadow-glow">
                  <User className="h-14 w-14 text-white/90" />
                </span>
                <div className="mt-5 text-xl font-semibold text-ink-50">
                  {call.peer.full_name ?? `@${call.peer.username}`}
                </div>
                <div className="mt-2 text-sm text-ink-500">
                  {call.phase === "active" && call.startedAt ? (
                    <span className="text-base font-medium text-ink-200">{formatClock(durationSec)}</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <PhoneCall className="h-4 w-4 animate-pulse" />
                      {call.phase === "ringing"
                        ? "Ringing…"
                        : call.role === "caller"
                          ? "Calling…"
                          : "Connecting…"}
                    </span>
                  )}
                </div>
                {call.muted && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-300/90">
                    <MicOff className="h-3.5 w-3.5" />
                    You are muted
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3 px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border-strong bg-glass-strong px-4 py-3 shadow-dialog backdrop-blur-2xl">
          <CallButton
            label={call.muted ? "Unmute microphone" : "Mute microphone"}
            active={call.muted}
            onClick={manager.toggleMute}
          >
            {call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </CallButton>

          {isVideo ? (
            <CallButton
              label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
              active={call.cameraOff}
              onClick={manager.toggleCamera}
            >
              {call.cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </CallButton>
          ) : null}

          {callConnected && (
            <CallButton
              label={call.screenActive ? "Stop sharing screen" : "Share screen"}
              active={call.screenActive}
              onClick={() => {
                setSharingBusy(true);
                void manager.toggleScreenShare().finally(() => setSharingBusy(false));
              }}
            >
              {sharingBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : call.screenActive ? (
                <ScreenShareOff className="h-5 w-5" />
              ) : (
                <ScreenShare className="h-5 w-5" />
              )}
            </CallButton>
          )}

          <button
            type="button"
            onClick={manager.endCall}
            aria-label="End call"
            title="End call"
            className="ml-1 flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500 text-white shadow-glow-sm transition-all duration-300 ease-premium hover:scale-105 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
          >
            <PhoneCall className="h-5 w-5 rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}
