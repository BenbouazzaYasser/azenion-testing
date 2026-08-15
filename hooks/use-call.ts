"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  type CallEvent,
  type CallEventType,
  type CallKind,
  type CallPeer,
  type CallPhase,
  RING_TIMEOUT_MS,
  INCOMING_TIMEOUT_MS,
  CONNECTING_TIMEOUT_MS,
  DISCONNECT_WAIT_MS,
} from "@/lib/call";

export interface CallState {
  phase: CallPhase;
  kind: CallKind | null;
  callId: string | null;
  /** Conversation the current call belongs to (drives navigation + signaling). */
  conversationId: string | null;
  /** The other party of the current call. */
  peer: CallPeer | null;
  isCaller: boolean;
  micOn: boolean;
  camOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  durationSec: number;
  notice: string | null;
}

const INITIAL_STATE: CallState = {
  phase: "idle",
  kind: null,
  callId: null,
  conversationId: null,
  peer: null,
  isCaller: false,
  micOn: false,
  camOn: false,
  localStream: null,
  remoteStream: null,
  durationSec: 0,
  notice: null,
};

interface UseCallOptions {
  currentUserId: string;
  /** When true, the global incoming-call listener + signaling is active. */
  enabled: boolean;
  /**
   * The conversation the user currently has open. Used to start OUTGOING
   * calls; incoming calls carry their own conversation + peer in the event.
   */
  context: { conversationId: string; peer: CallPeer } | null;
}

export interface UseCallReturn {
  state: CallState;
  startCall: (kind: CallKind) => void;
  acceptCall: () => void;
  declineCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

export function useCall({ currentUserId, enabled, context }: UseCallOptions): UseCallReturn {
  const [state, setState] = useState<CallState>(INITIAL_STATE);

  const stateRef = useRef<CallState>(INITIAL_STATE);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteOfferRef = useRef<string | null>(null);
  const bufferedRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const timersRef = useRef<Record<string, number>>({});
  const durationStartRef = useRef<number>(0);
  const durationTimerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const optionsRef = useRef({ currentUserId, enabled, context });
  optionsRef.current = { currentUserId, enabled, context };

  const publish = useCallback((patch: Partial<CallState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
  }, []);

  const clearTimer = useCallback((key: string) => {
    const t = timersRef.current[key];
    if (t) {
      window.clearTimeout(t);
      delete timersRef.current[key];
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const key of Object.keys(timersRef.current)) clearTimer(key);
  }, [clearTimer]);

  const sendEvent = useCallback((type: CallEventType, payload: Record<string, unknown>) => {
    const { currentUserId: uid } = optionsRef.current;
    const { conversationId: cid, callId } = stateRef.current;
    if (!cid || !uid || !callId) return;
    void createClient()
      .from("call_events")
      .insert({
        conversation_id: cid,
        sender_id: uid,
        call_id: callId,
        event_type: type,
        payload,
      })
      .then(() => undefined);
  }, []);

  const sendEventForCall = useCallback(
    (conversationId: string, callId: string, type: CallEventType, payload: Record<string, unknown>) => {
      const { currentUserId: uid } = optionsRef.current;
      if (!uid) return;
      void createClient()
        .from("call_events")
        .insert({
          conversation_id: conversationId,
          sender_id: uid,
          call_id: callId,
          event_type: type,
          payload,
        })
        .then(() => undefined);
    },
    [],
  );

  const stopDuration = useCallback(() => {
    if (durationTimerRef.current !== null) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const startDuration = useCallback(() => {
    stopDuration();
    durationStartRef.current = Date.now();
    publish({ durationSec: 0 });
    durationTimerRef.current = window.setInterval(() => {
      publish({ durationSec: Math.floor((Date.now() - durationStartRef.current) / 1000) });
    }, 1000);
  }, [publish, stopDuration]);

  const teardown = useCallback(
    (notice: string | null) => {
      clearAllTimers();
      stopDuration();
      const pc = pcRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
      }
      pcRef.current = null;
      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getTracks()) track.stop();
      }
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      remoteOfferRef.current = null;
      bufferedRef.current = [];
      remoteDescSetRef.current = false;
      publish({
        phase: "idle",
        kind: null,
        callId: null,
        conversationId: null,
        peer: null,
        isCaller: false,
        micOn: false,
        camOn: false,
        localStream: null,
        remoteStream: null,
        durationSec: 0,
      });
      if (notice) toast.info(notice);
    },
    [clearAllTimers, publish, stopDuration],
  );
  const teardownRef = useRef(teardown);
  teardownRef.current = teardown;

  const scheduleDisconnectEnd = useCallback(() => {
    clearTimer("disconnect");
    timersRef.current.disconnect = window.setTimeout(() => {
      const pc = pcRef.current;
      if (
        pc &&
        (pc.connectionState === "disconnected" || pc.connectionState === "failed")
      ) {
        const { callId } = stateRef.current;
        if (callId) sendEvent("end", {});
        teardownRef.current("Call ended");
      }
    }, DISCONNECT_WAIT_MS);
  }, [clearTimer, sendEvent]);

  const flushCandidates = useCallback(() => {
    const pc = pcRef.current;
    if (!pc) return;
    const pending = bufferedRef.current;
    bufferedRef.current = [];
    for (const candidate of pending) {
      void pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const { callId } = stateRef.current;
      if (!callId) return;
      sendEvent("ice", {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      });
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      publish({ remoteStream: stream });
    };

    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;
      switch (pc.connectionState) {
        case "connected": {
          clearTimer("disconnect");
          clearTimer("connecting");
          clearTimer("ring");
          clearTimer("incoming");
          startDuration();
          publish({ phase: "active", notice: null });
          break;
        }
        case "disconnected":
          scheduleDisconnectEnd();
          break;
        case "failed": {
          const phase = stateRef.current.phase;
          if (phase === "active" || phase === "connecting") {
            const { callId } = stateRef.current;
            if (callId) sendEvent("end", {});
            teardownRef.current("Connection lost");
          }
          break;
        }
        default:
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") {
        scheduleDisconnectEnd();
      } else {
        clearTimer("disconnect");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [clearTimer, publish, scheduleDisconnectEnd, sendEvent, startDuration]);

  const handleOffer = useCallback(
    async (event: CallEvent) => {
      const kind = event.payload.kind as CallKind;
      if (kind !== "audio" && kind !== "video") return;

      // One call at a time: decline any second call while busy.
      if (stateRef.current.phase !== "idle") {
        if (stateRef.current.callId !== event.call_id) {
          sendEventForCall(event.conversation_id, event.call_id, "busy", {});
        }
        return;
      }

      const sdp = event.payload.sdp as string | undefined;
      if (!sdp) return;

      const callId = event.call_id;
      const conversationId = event.conversation_id;

      // Resolve the caller's profile for the incoming-call UI. Uses the
      // SECURITY DEFINER get_call_peer RPC, which only returns a profile when
      // both the receiver and the caller are members of the conversation (the
      // general profiles SELECT policy is own-profile-only).
      let callerPeer: CallPeer | null = null;
      const { data: profile } = (await createClient()
        .rpc("get_call_peer", {
          p_conversation_id: event.conversation_id,
          p_user_id: event.sender_id,
        })
        .maybeSingle()) as { data: CallPeer | null };
      if (profile) {
        callerPeer = {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          username: profile.username,
        };
      }
      if (stateRef.current.phase !== "idle" || stateRef.current.callId !== null) return;

      remoteOfferRef.current = sdp;
      bufferedRef.current = [];
      remoteDescSetRef.current = false;
      publish({
        phase: "incoming",
        kind,
        callId,
        conversationId,
        peer: callerPeer,
        isCaller: false,
        micOn: false,
        camOn: false,
        localStream: null,
        remoteStream: null,
        notice: null,
      });

      timersRef.current.incoming = window.setTimeout(() => {
        if (stateRef.current.phase === "incoming" && stateRef.current.callId === callId) {
          teardownRef.current(null);
        }
      }, INCOMING_TIMEOUT_MS);
    },
    [publish, sendEventForCall],
  );

  const handleAnswer = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      if (stateRef.current.phase !== "outgoing") return;
      const sdp = event.payload.sdp as string | undefined;
      const pc = pcRef.current;
      if (!sdp || !pc) return;
      void (async () => {
        try {
          await pc.setRemoteDescription({ type: "answer", sdp });
          remoteDescSetRef.current = true;
          flushCandidates();
        } catch {
          // Malformed/stale answer; the ICE/connection state will surface a failure.
        }
      })();
      clearTimer("ring");
      timersRef.current.connecting = window.setTimeout(() => {
        if (stateRef.current.phase === "connecting") {
          const { callId } = stateRef.current;
          if (callId) sendEvent("end", {});
          teardownRef.current("Call ended");
        }
      }, CONNECTING_TIMEOUT_MS);
      publish({ phase: "connecting" });
    },
    [clearTimer, flushCandidates, publish, sendEvent],
  );

  const handleIce = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      const pc = pcRef.current;
      if (!pc) return;
      const candidate: RTCIceCandidateInit = {
        candidate: event.payload.candidate as string,
        sdpMid: (event.payload.sdpMid as string) ?? null,
        sdpMLineIndex: (event.payload.sdpMLineIndex as number) ?? null,
      };
      if (!remoteDescSetRef.current) {
        bufferedRef.current.push(candidate);
        return;
      }
      void pc.addIceCandidate(candidate).catch(() => undefined);
    },
    [],
  );

  const handleCancel = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      if (stateRef.current.phase !== "incoming") return;
      teardownRef.current("Call cancelled");
    },
    [],
  );

  const handleDecline = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      if (stateRef.current.phase !== "outgoing") return;
      teardownRef.current("Call declined");
    },
    [],
  );

  const handleBusy = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      if (stateRef.current.phase !== "outgoing") return;
      teardownRef.current("User is busy");
    },
    [],
  );

  const handleEnd = useCallback(
    (event: CallEvent) => {
      if (event.sender_id !== stateRef.current.peer?.id) return;
      if (event.call_id !== stateRef.current.callId) return;
      const phase = stateRef.current.phase;
      if (phase === "outgoing" || phase === "incoming" || phase === "connecting" || phase === "active") {
        teardownRef.current("Call ended");
      }
    },
    [],
  );

  const handleEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const row = payload.new as CallEvent | null;
      if (!row) return;
      if (row.sender_id === optionsRef.current.currentUserId) return;
      switch (row.event_type) {
        case "offer":
          void handleOffer(row);
          break;
        case "answer":
          handleAnswer(row);
          break;
        case "ice":
          handleIce(row);
          break;
        case "cancel":
          handleCancel(row);
          break;
        case "decline":
          handleDecline(row);
          break;
        case "busy":
          handleBusy(row);
          break;
        case "end":
          handleEnd(row);
          break;
        default:
          break;
      }
    },
    [handleAnswer, handleBusy, handleCancel, handleDecline, handleEnd, handleIce, handleOffer],
  );

  // Global signaling listener: receives call events for every conversation the
  // user is a member of (RLS restricts the realtime delivery accordingly), so an
  // incoming call surfaces regardless of which page the user is currently on.
  useEffect(() => {
    if (!enabled || !currentUserId) return;

    teardownRef.current(null);

    const supabase = createClient();
    const channel = supabase
      .channel(`calls:${currentUserId}`)
      .on<Record<string, unknown>>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_events" },
        handleEvent,
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      teardownRef.current(null);
    };
  }, [enabled, currentUserId, handleEvent]);

  // End/cancel signaling on tab close or navigation so the far end never hangs.
  useEffect(() => {
    function onPageHide() {
      const { currentUserId: uid } = optionsRef.current;
      const { conversationId, phase, callId } = stateRef.current;
      if (!conversationId || !uid || !callId || phase === "idle" || phase === "ended") return;
      const type: CallEventType =
        phase === "outgoing" ? "cancel" : phase === "incoming" ? "decline" : "end";
      const body = JSON.stringify({ conversationId, callId, type });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/call/end",
          new Blob([body], { type: "application/json" }),
        );
      } else {
        void fetch("/api/call/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const startCall = useCallback(
    async (kind: CallKind) => {
      const ctx = optionsRef.current.context;
      if (!optionsRef.current.enabled || !ctx) return;
      if (stateRef.current.phase !== "idle") return;

      const callId = crypto.randomUUID();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video:
            kind === "video"
              ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
              : false,
        });
      } catch {
        toast.error(
          kind === "video"
            ? "Camera or microphone permission denied. Enable access to start a video call."
            : "Microphone permission denied. Enable access to start a voice call.",
        );
        return;
      }

      localStreamRef.current = stream;
      publish({
        phase: "outgoing",
        kind,
        callId,
        conversationId: ctx.conversationId,
        peer: ctx.peer,
        isCaller: true,
        micOn: true,
        camOn: kind === "video",
        localStream: stream,
        remoteStream: null,
        notice: null,
      });

      const pc = createPeerConnection();
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendEvent("offer", { kind, sdp: offer.sdp });
        } catch {
          teardownRef.current("Could not start call");
          return;
        }
      })();

      timersRef.current.ring = window.setTimeout(() => {
        if (stateRef.current.phase === "outgoing") {
          const { callId: cid } = stateRef.current;
          if (cid) sendEvent("cancel", {});
          teardownRef.current("No answer");
        }
      }, RING_TIMEOUT_MS);
    },
    [createPeerConnection, publish, sendEvent],
  );

  const acceptCall = useCallback(async () => {
    if (stateRef.current.phase !== "incoming") return;
    const kind = stateRef.current.kind ?? "audio";
    const callId = stateRef.current.callId;
    const offerSdp = remoteOfferRef.current;
    if (!callId || !offerSdp) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          kind === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
      });
    } catch {
      sendEvent("decline", {});
      teardownRef.current(null);
      toast.error(
        kind === "video"
          ? "Camera or microphone permission denied. Call declined."
          : "Microphone permission denied. Call declined.",
      );
      return;
    }

    localStreamRef.current = stream;
    const pc = createPeerConnection();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    void (async () => {
      try {
        await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
        remoteDescSetRef.current = true;
        flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendEvent("answer", { sdp: answer.sdp });
      } catch {
        teardownRef.current(null);
        toast.error("Could not connect the call.");
        return;
      }
    })();

    clearTimer("incoming");
    timersRef.current.connecting = window.setTimeout(() => {
      if (stateRef.current.phase === "connecting") {
        const { callId: cid } = stateRef.current;
        if (cid) sendEvent("end", {});
        teardownRef.current("Call ended");
      }
    }, CONNECTING_TIMEOUT_MS);
    publish({ phase: "connecting", micOn: true, camOn: kind === "video", localStream: stream });
  }, [clearTimer, createPeerConnection, flushCandidates, publish, sendEvent]);

  const declineCall = useCallback(() => {
    if (stateRef.current.phase !== "incoming") return;
    sendEvent("decline", {});
    teardownRef.current(null);
  }, [sendEvent]);

  const cancelCall = useCallback(() => {
    if (stateRef.current.phase !== "outgoing") return;
    sendEvent("cancel", {});
    teardownRef.current(null);
  }, [sendEvent]);

  const endCall = useCallback(() => {
    const phase = stateRef.current.phase;
    if (phase === "active" || phase === "connecting") {
      sendEvent("end", {});
      teardownRef.current("Call ended");
    }
  }, [sendEvent]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !stateRef.current.micOn;
    for (const track of stream.getAudioTracks()) track.enabled = enabled;
    publish({ micOn: enabled });
  }, [publish]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !stateRef.current.camOn;
    for (const track of stream.getVideoTracks()) track.enabled = enabled;
    publish({ camOn: enabled });
  }, [publish]);

  return {
    state,
    startCall,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    toggleMic,
    toggleCamera,
  };
}
