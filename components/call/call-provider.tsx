"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useCallManager } from "@/lib/call/use-call-manager";
import type { CallKind, CallPeer, CallSession, IncomingCallInfo } from "@/lib/call/types";
import { IncomingCallOverlay } from "@/components/call/incoming-call-overlay";
import { ActiveCallOverlay } from "@/components/call/active-call-overlay";

export interface CallContextValue {
  activeCall: CallSession | null;
  incomingCall: (IncomingCallInfo & { offer?: import("@/lib/call/types").OfferPayload }) | null;
  startCall: (conversationId: string, peer: CallPeer, kind: CallKind) => Promise<{ error?: string }>;
  acceptCall: () => Promise<{ error?: string }>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<{ error?: string }>;
  resetIncoming: () => void;
  isCallActive: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

/**
 * Global provider mounted once in the root layout. It owns the singleton
 * realtime incoming-call listener, the WebRTC peer-connection lifecycle and
 * the active/incoming call UI overlays. Incoming calls therefore surface on
 * any page, exactly like the chat-unread / notification realtime modules.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const manager = useCallManager();
  const pathname = usePathname();
  const lastErrorShownRef = useRef<string | null>(null);

  const activeCall = manager.activeCall;
  const canHostOverlay = !pathname || !pathname.startsWith("/login");

  // Surface outgoing-call errors (media/support) as toasts.
  useEffect(() => {
    function onError(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      if (lastErrorShownRef.current === detail) return;
      lastErrorShownRef.current = detail;
      toast.error(detail);
      setTimeout(() => {
        lastErrorShownRef.current = null;
      }, 3000);
    }
    window.addEventListener("azenion:call-error", onError as EventListener);
    return () => window.removeEventListener("azenion:call-error", onError as EventListener);
  }, []);

  const startCall = useCallback(
    async (conversationId: string, peer: CallPeer, kind: CallKind) => {
      const res = await manager.startCall(conversationId, peer, kind);
      if (res.error) toast.error(res.error);
      return res;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manager.startCall],
  );

  const acceptCall = useCallback(async () => {
    const res = await manager.acceptCall();
    if (res.error) toast.error(res.error);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.acceptCall]);

  const toggleScreenShare = useCallback(async () => {
    const res = await manager.toggleScreenShare();
    if (res.error) toast.error(res.error);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.toggleScreenShare]);

  const value = useMemo<CallContextValue>(
    () => ({
      activeCall,
      incomingCall: manager.incomingCall,
      startCall,
      acceptCall,
      declineCall: manager.declineCall,
      endCall: manager.endCall,
      toggleMute: manager.toggleMute,
      toggleCamera: manager.toggleCamera,
      toggleScreenShare,
      resetIncoming: manager.resetIncoming,
      isCallActive:
        !!activeCall && activeCall.phase !== "ended" && activeCall.phase !== "idle",
    }),
    [activeCall, manager, startCall, acceptCall, toggleScreenShare],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {canHostOverlay && manager.incomingCall ? (
        <IncomingCallOverlay
          info={manager.incomingCall}
          onAccept={() => void acceptCall()}
          onDecline={manager.declineCall}
        />
      ) : null}
      {canHostOverlay && activeCall && activeCall.phase !== "ended" ? (
        <ActiveCallOverlay call={activeCall} manager={manager} />
      ) : null}
    </CallContext.Provider>
  );
}
