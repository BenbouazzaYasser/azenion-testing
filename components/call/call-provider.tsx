"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type {
  CallKind,
  CallPeer,
  CallSession,
  IncomingCallInfo,
  OfferPayload,
} from "@/lib/call/types";

export interface CallContextValue {
  activeCall: CallSession | null;
  incomingCall: (IncomingCallInfo & { offer?: OfferPayload }) | null;
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
 * Stable no-op shell. Nothing in the app reads this value today — call
 * buttons dispatch window events (see `requestCall`), which the lazy runtime's
 * manager handles and renders overlays for. Kept for API compatibility.
 */
const EMPTY_RUNTIME: CallContextValue = {
  activeCall: null,
  incomingCall: null,
  startCall: async () => ({ error: "Calls are still initializing." }),
  acceptCall: async () => ({ error: "Calls are still initializing." }),
  declineCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
  toggleScreenShare: async () => ({ error: "Calls are still initializing." }),
  resetIncoming: () => {},
  isCallActive: false,
};

/**
 * The WebRTC runtime (manager + signaling + peer + media + overlays) is
 * code-split and fetched/executed only after hydration. The provider wrapper
 * stays mounted so the children subtree never remounts.
 */
const LazyCallRuntime = dynamic(
  () => import("@/components/call/call-runtime").then((m) => m.CallRuntime),
  { ssr: false },
);

/**
 * Global provider mounted once in the root layout. It owns the singleton
 * realtime incoming-call listener, the WebRTC peer-connection lifecycle and
 * the active/incoming call UI overlays. Incoming calls therefore surface on
 * any page, exactly like the chat-unread / notification realtime modules.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const lastErrorShownRef = useRef<string | null>(null);

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

  return (
    <CallContext.Provider value={EMPTY_RUNTIME}>
      {children}
      <LazyCallRuntime />
    </CallContext.Provider>
  );
}