"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useCall, type CallState } from "@/hooks/use-call";
import type { CallKind, CallPeer } from "@/lib/call";
import { IncomingCallOverlay } from "@/components/chat/incoming-call-overlay";
import { ActiveCallOverlay } from "@/components/chat/active-call-overlay";

export interface CallContextValue {
  state: CallState;
  /**
   * Registers the conversation currently open so OUTGOING calls can be
   * targeted at it. Set to null when leaving the chat.
   */
  setContext: (ctx: { conversationId: string; peer: CallPeer } | null) => void;
  startCall: (kind: CallKind) => void;
  acceptCall: () => void;
  declineCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) {
    throw new Error("useCallContext must be used within <CallProvider>");
  }
  return value;
}

/**
 * App-level call host. Runs the single global signaling listener (one realtime
 * subscription for the signed-in user, RLS-scoped to their conversations) and
 * renders the incoming-call popup + active-call UI on top of ANY page, so a
 * user receives calls whether they are on /feed, /community, /projects, inside
 * another chat, etc.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const [context, setContextState] = useState<{ conversationId: string; peer: CallPeer } | null>(null);

  const call = useCall({
    currentUserId: user?.id ?? "",
    enabled: !!user,
    context,
  });

  const setContext = useCallback((ctx: { conversationId: string; peer: CallPeer } | null) => {
    setContextState(ctx);
  }, []);

  const acceptCall = useCallback(() => {
    const conversationId = call.state.conversationId;
    call.acceptCall();
    if (conversationId) router.push(`/chat/${conversationId}`);
  }, [call, router]);

  const value = useMemo<CallContextValue>(
    () => ({
      state: call.state,
      setContext,
      startCall: call.startCall,
      acceptCall,
      declineCall: call.declineCall,
      cancelCall: call.cancelCall,
      endCall: call.endCall,
      toggleMic: call.toggleMic,
      toggleCamera: call.toggleCamera,
    }),
    [acceptCall, call, setContext],
  );

  return (
    <CallContext.Provider value={value}>
      {children}

      {call.state.phase === "incoming" ? (
        <IncomingCallOverlay
          kind={call.state.kind ?? "audio"}
          peer={call.state.peer}
          onAccept={acceptCall}
          onDecline={call.declineCall}
        />
      ) : null}

      {call.state.phase === "outgoing" ||
      call.state.phase === "connecting" ||
      call.state.phase === "active" ? (
        <ActiveCallOverlay
          state={call.state}
          peer={call.state.peer}
          onEnd={call.endCall}
          onCancel={call.cancelCall}
          onToggleMic={call.toggleMic}
          onToggleCamera={call.toggleCamera}
        />
      ) : null}
    </CallContext.Provider>
  );
}
