"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallKind, CallPeer } from "@/lib/call";
import { peerDisplayName, peerInitial } from "@/lib/call";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { cn } from "@/lib/utils";

interface IncomingCallOverlayProps {
  kind: CallKind;
  peer: CallPeer | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallOverlay({ kind, peer, onAccept, onDecline }: IncomingCallOverlayProps) {
  const panelRef = useDialogFocus<HTMLDivElement>(true);

  const isVideo = kind === "video";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss incoming call"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onDecline}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={isVideo ? "Incoming video call" : "Incoming voice call"}
        className="relative w-full max-w-sm animate-dropdown-in overflow-hidden rounded-3xl border border-border-strong/[0.12] bg-glass shadow-dropdown backdrop-blur-2xl backdrop-saturate-150 focus:outline-none"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/25 blur-[80px]"
        />

        <div className="relative flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 animate-pulse-glow rounded-full bg-accent/30 blur-2xl"
            />
            {peer?.avatar_url ? (
              <img
                src={peer.avatar_url}
                alt=""
                className="relative h-20 w-20 rounded-full border-2 border-accent-400/40 object-cover shadow-[0_0_40px_-8px_rgba(109,109,255,0.7)]"
              />
            ) : (
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent-400/40 bg-gradient-to-br from-accent to-accent-glow text-2xl font-semibold text-white shadow-[0_0_40px_-8px_rgba(109,109,255,0.7)]">
                {peerInitial(peer)}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong/[0.12] bg-void-900 text-accent-300">
              {isVideo ? <Video size={16} /> : <Phone size={16} />}
            </span>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-ink-50">
            {peerDisplayName(peer)}
          </h2>
          {peer?.username ? (
            <p className="mt-0.5 text-xs text-ink-500">@{peer.username}</p>
          ) : null}
          <p className="mt-3 text-sm text-accent-300">
            {isVideo ? "Incoming video call" : "Incoming voice call"}
          </p>

          <div className="mt-8 flex w-full items-center justify-center gap-5">
            <button
              type="button"
              onClick={onDecline}
              aria-label="Decline call"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/15 text-red-400 transition-all duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 active:scale-[0.97]"
            >
              <PhoneOff size={20} />
            </button>

            <button
              type="button"
              onClick={onAccept}
              aria-label="Accept call"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-glow-sm transition-all duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 active:scale-[0.97]"
            >
              <Phone size={20} className={cn(isVideo && "rotate-[135deg]")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
