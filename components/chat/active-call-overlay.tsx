"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { CallPeer, CallPhase } from "@/lib/call";
import { formatDuration, peerDisplayName, peerInitial } from "@/lib/call";
import { cn } from "@/lib/utils";

interface ActiveCallState {
  phase: CallPhase;
  kind: "audio" | "video" | null;
  isCaller: boolean;
  micOn: boolean;
  camOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  durationSec: number;
}

interface ActiveCallOverlayProps {
  state: ActiveCallState;
  peer: CallPeer | null;
  onEnd: () => void;
  onCancel: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

function StreamVideo({
  stream,
  className,
  muted = true,
}: {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
}

export function ActiveCallOverlay({
  state,
  peer,
  onEnd,
  onCancel,
  onToggleMic,
  onToggleCamera,
}: ActiveCallOverlayProps) {
  const { phase, kind, isCaller, micOn, camOn, localStream, remoteStream, durationSec } = state;
  const isVideo = kind === "video";
  const name = peerDisplayName(peer);
  const showVideoLayout = isVideo && phase === "active";

  const controlBase =
    "flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 active:scale-[0.97] sm:h-14 sm:w-14";
  const toggleOn =
    "border-border-strong/[0.2] bg-void-900/80 text-ink-100 backdrop-blur-xl hover:scale-105 hover:border-accent-400/50 hover:text-accent-300 hover:shadow-glow-sm";
  const toggleOff =
    "border-red-500/40 bg-red-500/80 text-white backdrop-blur-xl hover:scale-105 hover:bg-red-500 hover:shadow-[0_0_24px_-6px_rgba(248,113,113,0.6)]";

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-void-950/95 backdrop-blur-md">
      {/* Ambient accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(40,40,255,0.16), transparent 45%), radial-gradient(circle at 85% 95%, rgba(109,109,255,0.12), transparent 45%)",
        }}
      />

      {showVideoLayout ? (
        <div className="relative h-full w-full">
          {remoteStream ? (
            <StreamVideo stream={remoteStream} className="absolute inset-0 h-full w-full object-cover" muted={false} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                {peer?.avatar_url ? (
                  <img src={peer.avatar_url} alt="" className="h-24 w-24 rounded-full border border-border-strong/20 object-cover" />
                ) : (
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-3xl font-semibold text-white">
                    {peerInitial(peer)}
                  </span>
                )}
                <p className="mt-4 text-base font-semibold text-ink-100">{name}</p>
                <p className="text-sm text-ink-500">Waiting for video…</p>
              </div>
            </div>
          )}

          {/* Top: caller name + duration */}
          <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-5 sm:pt-6">
            <p className="max-w-[75vw] truncate text-sm font-semibold text-ink-50 sm:text-base">{name}</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-accent-300">{formatDuration(durationSec)}</p>
          </div>

          {/* Local preview (PiP) */}
          <div className="absolute bottom-24 right-4 z-10 aspect-[3/4] w-28 overflow-hidden rounded-2xl border border-border-strong/30 bg-void-900 shadow-dropdown sm:bottom-28 sm:right-6 sm:w-40">
            {camOn && localStream ? (
              <StreamVideo stream={localStream} className="h-full w-full object-cover" muted />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-600">
                <VideoOff size={20} />
              </div>
            )}
            {!camOn ? (
              <span className="absolute inset-x-0 bottom-0 bg-void-950/70 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-ink-400">
                Camera off
              </span>
            ) : null}
          </div>

          {/* Controls */}
          <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-center gap-4 sm:bottom-7">
            <button
              type="button"
              onClick={onToggleMic}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={!micOn}
              className={cn(controlBase, micOn ? toggleOn : toggleOff)}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              type="button"
              onClick={onEnd}
              aria-label="End call"
              className={cn(
                controlBase,
                "border-red-500/50 bg-red-500 text-white shadow-glow-sm hover:scale-105 hover:bg-red-500 hover:shadow-[0_0_30px_-6px_rgba(248,113,113,0.8)]",
              )}
            >
              <PhoneOff size={22} />
            </button>

            <button
              type="button"
              onClick={onToggleCamera}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              aria-pressed={!camOn}
              className={cn(controlBase, camOn ? toggleOn : toggleOff)}
            >
              {camOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="relative">
            <div
              aria-hidden
              className={cn(
                "absolute -inset-4 rounded-full bg-accent/25 blur-2xl",
                phase === "outgoing" && "animate-pulse-glow",
              )}
            />
            {peer?.avatar_url ? (
              <img
                src={peer.avatar_url}
                alt=""
                className="relative h-24 w-24 rounded-full border-2 border-accent-400/40 object-cover shadow-[0_0_50px_-10px_rgba(109,109,255,0.8)] sm:h-28 sm:w-28"
              />
            ) : (
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent-400/40 bg-gradient-to-br from-accent to-accent-glow text-3xl font-semibold text-white shadow-[0_0_50px_-10px_rgba(109,109,255,0.8)] sm:h-28 sm:w-28">
                {peerInitial(peer)}
              </span>
            )}
          </div>

          <h2 className="mt-7 max-w-[80vw] truncate text-xl font-semibold text-ink-50 sm:text-2xl">{name}</h2>
          {peer?.username ? (
            <p className="mt-1 text-sm text-ink-500">@{peer.username}</p>
          ) : null}

          <p className="mt-4 text-sm font-medium text-accent-300">
            {phase === "outgoing"
              ? "Ringing…"
              : phase === "connecting"
                ? "Connecting…"
                : formatDuration(durationSec)}
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            {phase === "active" ? (
              <>
                <button
                  type="button"
                  onClick={onToggleMic}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  aria-pressed={!micOn}
                  className={cn(controlBase, micOn ? toggleOn : toggleOff)}
                >
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                {isVideo ? (
                  <button
                    type="button"
                    onClick={onToggleCamera}
                    aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                    aria-pressed={!camOn}
                    className={cn(controlBase, camOn ? toggleOn : toggleOff)}
                  >
                    {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                ) : null}
              </>
            ) : null}

            {phase === "outgoing" ? (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel call"
                className={cn(
                  controlBase,
                  "border-red-500/50 bg-red-500 text-white shadow-glow-sm hover:scale-105 hover:bg-red-500 hover:shadow-[0_0_30px_-6px_rgba(248,113,113,0.8)]",
                )}
              >
                <PhoneOff size={22} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onEnd}
                aria-label="End call"
                className={cn(
                  controlBase,
                  "border-red-500/50 bg-red-500 text-white shadow-glow-sm hover:scale-105 hover:bg-red-500 hover:shadow-[0_0_30px_-6px_rgba(248,113,113,0.8)]",
                )}
              >
                <PhoneOff size={22} />
              </button>
            )}
          </div>

          {phase === "outgoing" && (
            <p className="mt-6 text-xs text-ink-600">
              {isCaller ? "Waiting for the other side to pick up…" : "Starting the call…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
