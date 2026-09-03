"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncomingCallInfo } from "@/lib/call/types";

interface IncomingCallOverlayProps {
  info: IncomingCallInfo & { offer?: import("@/lib/call/types").OfferPayload };
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Full-screen incoming-call modal. Clearly communicates the caller, the call
 * type and the Accept/Decline actions without relying on sound. Auto-expires
 * server-side via the manager timeout and client-side via the manager.
 */
export function IncomingCallOverlay({ info, onAccept, onDecline }: IncomingCallOverlayProps) {
  const [callerName, setCallerName] = useState<string>("Incoming call");
  const [callerAvatar, setCallerAvatar] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    import("@/lib/call/signaling")
      .then(({ callSignaling }) =>
        callSignaling.getCallPeer(info.conversationId, info.senderId),
      )
      .then(({ peer, error }) => {
        if (cancelled) return;
        if (peer) {
          setCallerName(peer.full_name ?? `@${peer.username}`);
          setCallerAvatar(peer.avatar_url);
        } else if (error) {
          setCallerName("Incoming call");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [info]);

  // Play a ring tone once (if it can be built); never rely on it for the UI.
  useEffect(() => {
    let cancelled = false;
    let ctx: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    try {
      if (typeof window === "undefined") return;
      const AC = window.AudioContext ?? (
        window as unknown as { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const playTone = () => {
        if (!ctx || ctx.state === "closed") return;
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 640;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
      };
      playTone();
      interval = setInterval(playTone, 900);
    } catch {
      /* ignore audio errors */
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (ctx && ctx.state !== "closed") void ctx.close();
    };
  }, []);

  const isVideo = info.kind === "video";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming ${isVideo ? "video" : "voice"} call`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-void-950/80 p-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="rounded-3xl border border-border-strong bg-glass-strong p-8 text-center shadow-dialog backdrop-blur-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-accent-400/30 bg-gradient-to-br from-accent to-accent-glow shadow-glow">
            {callerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={callerAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-9 w-9 text-white/90" />
            )}
          </div>

          <div
            aria-hidden
            className="mx-auto mt-6 h-12 w-12 animate-[ring_1.8s_ease-in-out_infinite]"
            style={{ animation: "ring 1.8s ease-in-out infinite" }}
          >
            {isVideo ? (
              <Video className="h-12 w-12 text-accent-300" />
            ) : (
              <Phone className="h-12 w-12 text-accent-300" />
            )}
          </div>

          <div className="mt-4">
            <div className="truncate text-xl font-semibold text-ink-50">{callerName}</div>
            <div className="mt-1 text-sm text-ink-500">
              {isVideo ? "Incoming video call" : "Incoming voice call"}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={onDecline}
              aria-label="Decline call"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 text-red-300 shadow-glow-sm transition-all duration-300 ease-premium hover:scale-105 hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onAccept}
              aria-label="Accept call"
              className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/20 text-emerald-200 shadow-glow transition-all duration-300 ease-premium hover:scale-105 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              {isVideo ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-500">
            <VideoOff className="h-3.5 w-3.5" />
            <span>Requires camera &amp; microphone permission</span>
          </div>
        </div>
      </div>
    </div>
  );
}
