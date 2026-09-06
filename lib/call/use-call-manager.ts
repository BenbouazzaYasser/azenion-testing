"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callSignaling } from "@/lib/call/signaling";
import type { CallEventRow } from "@/lib/call/signaling";
import {
  closePeerConnection,
  createPeerConnection,
  stopTracks,
} from "@/lib/call/peer";
import {
  getScreenStream,
  getStream,
  getRtcSupport,
  supportsGetDisplayMedia,
} from "@/lib/call/media";
import type {
  CallKind,
  CallPeer,
  CallPhase,
  CallSession,
  IncomingCallInfo,
  OfferPayload,
  IcePayload,
} from "@/lib/call/types";

const RING_TIMEOUT_MS = 45_000; // caller gives up ringing after 45s
const INCOMING_TIMEOUT_MS = 45_000; // recipient auto-cancels an un-answered offer
const CONNECT_TIMEOUT_MS = 30_000; // no ICE connection within 30s -> fail

export interface CallRequestEvent {
  conversationId: string;
  peer: CallPeer;
  kind: CallKind;
  autoScreen?: boolean;
}

/**
 * Manages the full lifecycle of exactly one call at a time: global incoming
 * listener, outgoing ring, offer/answer/ICE exchange, media controls, screen
 * share and complete teardown. Only one active call (any phase) is permitted.
 */
function useCallManager() {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<
    (IncomingCallInfo & { offer?: OfferPayload }) | null
  >(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const screenReplacedTrackRef = useRef(false); // true if we swapped an existing camera sender
  const negotiatingRef = useRef(false); // guards concurrent (re)negotiation
  const activeRef = useRef<boolean>(false); // a call (any phase) is in flight
  const onCameraVideoRef = useRef(false); // is the local cam running (for screen-share restore)
  const autoScreenRef = useRef(false); // start screen sharing once the call connects
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalChannelRef = useRef<{ unsubscribe: () => void } | null>(null);
  // IDs of signaling rows already processed (dedupes live events vs replay).
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  // Remote ICE candidates that arrived before the remote description was set.
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = myUserId;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setMyUserId(session?.user?.id ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);



  const clearTimeouts = useCallback(() => {
    [startTimeoutRef, incomingTimeoutRef, connectTimeoutRef].forEach((r) => {
      if (r.current) {
        clearTimeout(r.current);
        r.current = null;
      }
    });
  }, []);

  const setPhase = useCallback((phase: CallPhase) => {
    setActiveCall((prev) => (prev ? { ...prev, phase } : prev));
  }, []);

  const patchActive = useCallback((patch: Partial<CallSession>) => {
    setActiveCall((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // Drains ICE candidates that arrived before the remote description was
  // set. Must be called after every successful setRemoteDescription.
  // Declared before handleEventRow (which depends on it).
  const flushQueuedIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(cand);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const teardown = useCallback(() => {
    if (signalChannelRef.current) {
      try {
        signalChannelRef.current.unsubscribe();
      } catch {
        /* noop */
      }
      signalChannelRef.current = null;
    }
    seenEventIdsRef.current.clear();
    pendingIceRef.current = [];
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    stopTracks(localStreamRef.current);
    localStreamRef.current = null;
    stopTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    screenReplacedTrackRef.current = false;
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* noop */
        }
      });
      remoteStreamRef.current = null;
    }
  }, []);

  const finishCall = useCallback(
    (endReason: CallSession["endReason"], error?: string) => {
      clearTimeouts();
      teardown();
      activeRef.current = false;
      setActiveCall((prev) =>
        prev ? { ...prev, phase: "ended", endReason, error, endedAt: Date.now() } : prev,
      );
    },
    [clearTimeouts, teardown],
  );

  const handleEventRow = useCallback(
    async (row: CallEventRow, targetCallId?: string) => {
      const myId = userIdRef.current;
      if (!myId || row.sender_id === myId) return;
      if (targetCallId && row.call_id !== targetCallId) return;

      if (!targetCallId) {
        if (row.event_type === "offer") {
          if (activeRef.current) {
            void callSignaling.sendBusy(row.conversation_id, row.call_id);
            return;
          }
          const offer = row.payload as unknown as OfferPayload;
          setIncomingCall((prev) => {
            if (prev && prev.callId === row.call_id) return prev;
            return {
              callId: row.call_id,
              conversationId: row.conversation_id,
              senderId: row.sender_id,
              kind: offer?.kind ?? "audio",
              offer,
            };
          });
          if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
          incomingTimeoutRef.current = setTimeout(() => {
            setIncomingCall((prev) => (prev && prev.callId === row.call_id ? null : prev));
          }, INCOMING_TIMEOUT_MS);
        }
        return;
      }

      switch (row.event_type) {
        case "offer": {
          const pc = pcRef.current;
          const sdp = (row.payload as { sdp?: string }).sdp;
          if (!pc || !sdp) break;
          try {
            if (pc.signalingState !== "stable") {
              await pc.setLocalDescription({ type: "rollback" });
            }
            await pc.setRemoteDescription({ type: "offer", sdp });
            await flushQueuedIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            void callSignaling.sendAnswer(row.conversation_id, row.call_id, { sdp: answer.sdp ?? "" });
          } catch {
            if (activeRef.current) finishCall("error", "Could not update the connection.");
          }
          break;
        }
        case "answer": {
          // Applies to the initial answer AND to answers for renegotiation
          // offers sent by either side (e.g. callee-started screen share).
          // The signaling-state guard keeps stray/duplicate answers harmless.
          if (pcRef.current) {
            const sdp = (row.payload as { sdp?: string }).sdp;
            if (!sdp) break;
            if (pcRef.current.signalingState !== "have-local-offer") break;
            if (activeCallRef.current?.phase === "ringing") setPhase("connecting");
            try {
              await pcRef.current.setRemoteDescription({ type: "answer", sdp });
              await flushQueuedIce();
            } catch {
              if (activeRef.current) finishCall("error", "Could not establish the connection.");
            }
          }
          break;
        }
        case "ice": {
          const cand = (row.payload as unknown as IcePayload).candidate;
          const pc = pcRef.current;
          if (!pc || !cand) break;
          if (!pc.remoteDescription) {
            // The candidate arrived before setRemoteDescription resolved
            // (common right after accept). Queue it instead of dropping it.
            pendingIceRef.current.push(cand);
            break;
          }
          try {
            await pc.addIceCandidate(cand);
          } catch {
            /* ignore */
          }
          break;
        }
        case "cancel": {
          if (activeCallRef.current?.role === "callee") finishCall("canceled");
          break;
        }
        case "decline": {
          if (activeCallRef.current?.role === "caller" && activeCallRef.current?.phase === "ringing") {
            finishCall("declined");
          }
          break;
        }
        case "busy": {
          if (activeCallRef.current?.role === "caller" && activeCallRef.current?.phase === "ringing") {
            finishCall("busy");
          }
          break;
        }
        case "end": {
          if (activeRef.current) finishCall("peer-left");
          break;
        }
        case "screen": {
          patchActive({ screenActive: !!(row.payload as { start?: boolean }).start });
          break;
        }
        default:
          break;
      }
    },
    [finishCall, patchActive, setPhase, flushQueuedIce],
  );

  // Replays signaling rows that were inserted before we subscribed to the
  // per-call channel. The callee typically subscribes seconds after the
  // caller sent the offer and started trickling ICE (host candidates are
  // gathered within milliseconds), so without this the callee permanently
  // misses the caller's early candidates and the call sticks on
  // "Connecting…". Live rows arriving during the fetch are deduped by id.
  const replayMissedEvents = useCallback(
    async (callId: string, role: "caller" | "callee") => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("call_events")
          .select("id,sender_id,call_id,conversation_id,event_type,payload,created_at")
          .eq("call_id", callId)
          .order("created_at", { ascending: true })
          .limit(200);
        for (const row of (data ?? []) as unknown as CallEventRow[]) {
          if (!row.id || seenEventIdsRef.current.has(row.id)) continue;
          // The callee already applied the initial offer in acceptCall and
          // never needs answers; the caller only needs the answer + ICE
          // (its own offer rows are skipped by the sender check anyway).
          if (role === "callee" && row.event_type !== "ice") continue;
          if (role === "caller" && row.event_type !== "answer" && row.event_type !== "ice") continue;
          seenEventIdsRef.current.add(row.id);
          await handleEventRow(row, callId);
        }
      } catch {
        /* realtime delivery covers the live path */
      }
    },
    [handleEventRow],
  );

  // (Re)negotiation offer loop shared by both roles. Guarded to run only
  // when signaling is stable; inbound offers are answered in handleEventRow.
  // The caller attaches it immediately; the callee attaches it only after
  // sending its initial answer — attaching it earlier would make the
  // callee's initial addTrack emit a rogue counter-offer (glare) that breaks
  // the handshake.
  const attachNegotiationHandler = useCallback(
    (pc: RTCPeerConnection, conversationId: string, callId: string) => {
      pc.onnegotiationneeded = () => {
        void (async () => {
          if (negotiatingRef.current) return;
          if (pc.signalingState !== "stable") return;
          negotiatingRef.current = true;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const res = await callSignaling.sendOffer(conversationId, callId, {
              kind: activeCallRef.current?.kind ?? "audio",
              sdp: offer.sdp ?? "",
            });
            if (res.error && activeRef.current) {
              finishCall("error", "Signaling failed.");
            }
          } catch {
            if (activeRef.current) finishCall("error", "Could not update the connection.");
          } finally {
            negotiatingRef.current = false;
          }
        })();
      };
    },
    [finishCall],
  );

  // ── Global incoming listener (arrives on any page) ────────────────────────
  useEffect(() => {
    if (!myUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("calls-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_events" },
        (payload) => void handleEventRow(payload.new as CallEventRow),
      )
      .on("broadcast", { event: "call-event" }, (payload) =>
        void handleEventRow(payload.payload as CallEventRow),
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myUserId, handleEventRow]);

  // External request to start a call (fired by the chat page ?call= param).
  useEffect(() => {
    function onRequest(e: Event) {
      const detail = (e as CustomEvent<CallRequestEvent>).detail;
      if (detail) {
        autoScreenRef.current = !!detail.autoScreen;
        void startCall(detail.conversationId, detail.peer, detail.kind);
      }
    }
    function onError(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) {
        window.dispatchEvent(
          new CustomEvent("azenion:call-error", { detail }),
        );
      }
    }
    window.addEventListener("azenion:call-request", onRequest as EventListener);
    window.addEventListener("azenion:call-signal-error", onError as EventListener);
    return () => {
      window.removeEventListener("azenion:call-request", onRequest as EventListener);
      window.removeEventListener("azenion:call-signal-error", onError as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Outgoing call (caller) ────────────────────────────────────────────────
  const startCall = useCallback(
    async (conversationId: string, peer: CallPeer, kind: CallKind): Promise<{ error?: string }> => {
      const support = getRtcSupport();
      if (!support.supported)
        return { error: support.reason ?? "Calls are unavailable." };
      if (activeRef.current || incomingCall) return { error: "You are already in a call." };

      // 1. Acquire media first so permission failures surface before ringing.
      if (kind === "video") {
        const { stream, error } = await getStream(true, true);
        if (error) return { error };
        if (stream) {
          localStreamRef.current = stream;
          onCameraVideoRef.current = true;
        }
      } else {
        const { stream, error } = await getStream(false, true);
        if (error) return { error };
        if (stream) localStreamRef.current = stream;
      }

      const callId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      activeRef.current = true;
      setIncomingCall(null);
      setActiveCall({
        callId,
        conversationId,
        kind,
        phase: "ringing",
        role: "caller",
        peer,
        localStream: localStreamRef.current ?? undefined,
        remoteStream: undefined,
        screenActive: false,
        connectionState: "new",
        muted: false,
        cameraOff: false,
        startedAt: null,
        endedAt: null,
      });

      // 2. Build the peer connection + add local tracks. The caller's
      //    onnegotiationneeded handler creates and sends the offer (also used
      //    for later renegotiation, e.g. when adding a screen-share track).
      const pc = await establishPeer(conversationId, callId, "caller");
      if (!pc) {
        finishCall("error", "Could not initialize the call.");
        return { error: "Could not initialize the call." };
      }

      // 3. Ring-timeout safety net.
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = setTimeout(() => {
        setActiveCall((prev) => {
          if (prev?.phase !== "ringing") return prev;
          activeRef.current = false;
          void callSignaling.sendCancel(prev.conversationId, prev.callId);
          teardown();
          return { ...prev, phase: "ended", endReason: "timeout", endedAt: Date.now() };
        });
      }, RING_TIMEOUT_MS);

      return {};
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRef, incomingCall, finishCall, teardown],
  );

  // ── Accept incoming (callee) ──────────────────────────────────────────────
  const acceptCall = useCallback(async (): Promise<{ error?: string }> => {
    const info = incomingCall;
    if (!info) return { error: "No incoming call." };
    const support = getRtcSupport();
    if (!support.supported) return { error: support.reason ?? "Calls are unavailable." };

    const { data: userData } = await createClient().auth.getUser();
    const myId = userData.user?.id;
    if (!myId) return { error: "Not signed in." };

    const { peer, error: peerError } = await callSignaling.getCallPeer(
      info.conversationId,
      info.senderId,
    );
    if (peerError || !peer) return { error: peerError ?? "Could not reach the caller." };

    // Media before answering.
    if (info.kind === "video") {
      const { stream, error } = await getStream(true, true);
      if (error) {
        void callSignaling.sendDecline(info.conversationId, info.callId);
        clearIncoming();
        return { error };
      }
      if (stream) {
        localStreamRef.current = stream;
        onCameraVideoRef.current = true;
      }
    } else {
      const { stream, error } = await getStream(false, true);
      if (error) {
        void callSignaling.sendDecline(info.conversationId, info.callId);
        clearIncoming();
        return { error };
      }
      if (stream) localStreamRef.current = stream;
    }

    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    setIncomingCall(null);
    activeRef.current = true;

    setActiveCall({
      callId: info.callId,
      conversationId: info.conversationId,
      kind: info.kind,
      phase: "connecting",
      role: "callee",
      peer,
      localStream: localStreamRef.current ?? undefined,
      remoteStream: undefined,
      screenActive: false,
      connectionState: "new",
      muted: false,
      cameraOff: false,
      startedAt: null,
      endedAt: null,
    });

    const pc = await establishPeer(info.conversationId, info.callId, "callee");
    if (!pc) {
      finishCall("error", "Could not initialize the connection.");
      return { error: "Could not initialize the connection." };
    }

    // Apply the caller's offer, then answer.
    const offer = info.offer;
    if (!offer?.sdp) {
      finishCall("error", "The call invitation could not be parsed.");
      return { error: "The call invitation could not be parsed." };
    }
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      await flushQueuedIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const result = await callSignaling.sendAnswer(info.conversationId, info.callId, {
        sdp: answer.sdp ?? "",
      });
      if (result.error) {
        finishCall("error", "Signaling failed. Please try again.");
        return { error: result.error };
      }
      // Initial handshake done — the callee may now renegotiate (e.g. when
      // it starts screen sharing in a voice call).
      attachNegotiationHandler(pc, info.conversationId, info.callId);
    } catch {
      finishCall("error", "Could not establish the connection.");
      return { error: "Could not establish the connection." };
    }

    return {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall, finishCall, attachNegotiationHandler]);

  // Creates + wires the peer connection and attaches local tracks. Sets up the
  // per-call signaling listener that handles the peer's events. The caller
  // sends the initial offer; after the handshake either side may renegotiate
  // (e.g. screen share from a voice call). Inbound offers are answered in
  // handleEventRow.
  const establishPeer = useCallback(
    async (
      conversationId: string,
      callId: string,
      role: "caller" | "callee",
    ): Promise<RTCPeerConnection | null> => {
      const supabase = createClient();

      // Fresh signaling state for this call.
      seenEventIdsRef.current.clear();
      pendingIceRef.current = [];

      const pc = createPeerConnection({
        onIceCandidate: (candidate) => {
          const payload: IcePayload = { candidate: candidate.toJSON() };
          void callSignaling.sendIce(conversationId, callId, payload);
        },
        onTrack: (stream) => {
          // Merge inbound tracks into one persistent remote stream. Replacing
          // the stream object on every ontrack (e.g. when a screen-share track
          // arrives mid-call) would detach the tracks the element is already
          // playing — killing voice audio when screen share starts.
          let remote = remoteStreamRef.current;
          if (!remote) {
            remote = new MediaStream();
            remoteStreamRef.current = remote;
          }
          for (const track of stream.getTracks()) {
            if (!remote.getTrackById(track.id)) {
              try {
                remote.addTrack(track);
              } catch {
                /* noop */
              }
            }
          }
          patchActive({ remoteStream: remote });
        },
        onConnectionStateChange: (state) => {
          patchActive({ connectionState: state });
          if (state === "connected") {
            patchActive({ phase: "active", startedAt: Date.now() });
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }
          } else if (state === "failed") {
            if (activeRef.current) finishCall("error", "The connection was lost.");
          } else if (state === "disconnected") {
            // Tolerate transient disconnects; 'failed' is terminal.
          }
        },
      });
      pcRef.current = pc;

      // Both sides drive negotiation: the initial offer from the caller plus
      // any later re-offer when either side adds a track (e.g. screen share
      // started by the callee in a voice call). Inbound offers are answered
      // in handleEventRow, which rolls back on glare. The callee gets its
      // handler in acceptCall after answering (see attachNegotiationHandler).
      if (role === "caller") attachNegotiationHandler(pc, conversationId, callId);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Per-call signaling listener. Rows are deduped by id because the
      // missed-event replay below can overlap with live deliveries.
      const onCallRow = (row: CallEventRow) => {
        if (row.id && seenEventIdsRef.current.has(row.id)) return;
        if (row.id) seenEventIdsRef.current.add(row.id);
        void handleEventRow(row, callId);
      };
      const channel = supabase
        .channel(`call-${callId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_events" },
          (payload) => onCallRow(payload.new as CallEventRow),
        );
      const bChannel = supabase
        .channel("calls-global-broadcast")
        .on("broadcast", { event: "call-event" }, (payload) =>
          onCallRow(payload.payload as CallEventRow),
        );
      channel.subscribe();
      bChannel.subscribe();
      signalChannelRef.current = {
        unsubscribe: () => {
          void supabase.removeChannel(channel);
          void supabase.removeChannel(bChannel);
        },
      };

      // Pick up signaling rows sent before we subscribed (the callee joins
      // seconds after the caller started trickling ICE candidates).
      void replayMissedEvents(callId, role);

      // Connection timeout safety net.
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = setTimeout(() => {
        setActiveCall((prev) => {
          if (!prev || prev.phase === "active") return prev;
          if (pcRef.current?.connectionState === "connected") return prev;
          if (activeRef.current) finishCall("error", "Could not connect the call.");
          return prev;
        });
      }, CONNECT_TIMEOUT_MS);

      return pc;
    },
    [finishCall, patchActive, setPhase, replayMissedEvents, attachNegotiationHandler],
  );

  // Keep a ref mirror of activeCall for use inside the signaling channel handler.
  const activeCallRef = useRef<CallSession | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const clearIncoming = useCallback(() => {
    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    setIncomingCall(null);
  }, []);

  const declineCall = useCallback(() => {
    const info = incomingCall;
    if (info) {
      void callSignaling.sendDecline(info.conversationId, info.callId);
      clearIncoming();
    }
  }, [incomingCall, clearIncoming]);

  const endCall = useCallback(() => {
    if (activeRef.current && activeCall) {
      const ringing = activeCall.phase === "ringing";
      if (ringing) {
        void callSignaling.sendCancel(activeCall.conversationId, activeCall.callId);
        finishCall("canceled");
      } else {
        void callSignaling.sendEnd(activeCall.conversationId, activeCall.callId);
        finishCall("ended");
      }
    }
  }, [activeCall, finishCall]);

  const toggleMute = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev || !prev.localStream) return prev;
      const nextMuted = !prev.muted;
      prev.localStream.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
      return { ...prev, muted: nextMuted };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setActiveCall((prev) => {
      if (!prev || !prev.localStream) return prev;
      const nextOff = !prev.cameraOff;
      prev.localStream.getVideoTracks().forEach((t) => (t.enabled = !nextOff));
      return { ...prev, cameraOff: nextOff };
    });
  }, []);

  const toggleScreenShare = useCallback(async (): Promise<{ error?: string }> => {
    const call = activeCall;
    if (!call) return { error: "No active call." };

    // Stop screen share:
    if (call.screenActive) {
      stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      if (screenReplacedTrackRef.current) {
        // Restore the camera track onto the existing video sender.
        restoreCameraTrack();
      } else if (screenSenderRef.current && pcRef.current) {
        // Voice-call path: we added a dedicated video sender, remove it.
        try {
          pcRef.current.removeTrack(screenSenderRef.current);
        } catch {
          /* noop */
        }
      }
      screenSenderRef.current = null;
      screenReplacedTrackRef.current = false;
      patchActive({ screenActive: false, screenStream: undefined });
      void callSignaling.sendScreen(call.conversationId, call.callId, { start: false });
      return {};
    }

    // Start screen share:
    if (!supportsGetDisplayMedia()) {
      return { error: "Screen sharing is not supported in this browser." };
    }
    if (!pcRef.current) {
      return { error: "Call is not connected yet. Try again once the call connects." };
    }
    // The OS capture picker can hang forever without settling on some
    // mobile browsers. Race it so a hung picker surfaces an error instead
    // of leaving the button spinning silently.
    let captureTimedOut = false;
    const { stream, error } = await Promise.race([
      getScreenStream().then((result) => {
        if (captureTimedOut && result.stream) stopTracks(result.stream);
        return result;
      }),
      new Promise<{ stream?: undefined; error: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              error: "Screen capture is not responding. Reload the page and try again.",
            }),
          60_000,
        ),
      ),
    ]);
    if (error) return { error };
    if (!stream) return { error: "Could not capture the screen." };
    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) {
      stopTracks(stream);
      return { error: "Could not capture the screen." };
    }
    screenStreamRef.current = stream;
    patchActive({ screenActive: true, screenStream: stream });
    void callSignaling.sendScreen(call.conversationId, call.callId, { start: true });

    const pc = pcRef.current;
    let sender: RTCRtpSender | undefined;
    const camSender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (camSender) {
      // Video call: swap the camera sender's track with the screen track.
      try {
        await camSender.replaceTrack(screenTrack);
      } catch {
        stopTracks(stream);
        screenStreamRef.current = null;
        patchActive({ screenActive: false, screenStream: undefined });
        void callSignaling.sendScreen(call.conversationId, call.callId, { start: false });
        return { error: "Could not start screen sharing. Please try again." };
      }
      sender = camSender;
      screenReplacedTrackRef.current = true;
    } else if (pc) {
      // Voice call: add a fresh video sender for the screen.
      try {
        sender = pc.addTrack(screenTrack, stream);
      } catch {
        sender = undefined;
      }
      screenReplacedTrackRef.current = false;
    }
    if (!sender) {
      stopTracks(stream);
      screenStreamRef.current = null;
      patchActive({ screenActive: false, screenStream: undefined });
      void callSignaling.sendScreen(call.conversationId, call.callId, { start: false });
      return { error: "Could not start screen sharing. Please try again." };
    }
    // Hint the encoder toward smooth, readable screen content: detail
    // preserves text sharpness, maintain-framerate avoids choppy motion when
    // the network/CPU is under pressure.
    try {
      screenTrack.contentHint = "detail";
    } catch {
      /* noop */
    }
    try {
      const params = sender.getParameters();
      params.degradationPreference = "maintain-framerate";
      await sender.setParameters(params);
    } catch {
      /* noop */
    }
    screenSenderRef.current = sender ?? null;

    // When the browser reports the user stopped sharing, clean up.
    const onScreenEnded = () => {
      if (!activeRef.current) return;
      stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      if (screenReplacedTrackRef.current) {
        restoreCameraTrack();
      } else if (sender && pcRef.current) {
        try {
          pcRef.current.removeTrack(sender);
        } catch {
          /* noop */
        }
      }
      screenSenderRef.current = null;
      screenReplacedTrackRef.current = false;
      patchActive({ screenActive: false, screenStream: undefined });
      void callSignaling.sendScreen(call.conversationId, call.callId, { start: false });
    };
    screenTrack.addEventListener("ended", onScreenEnded, { once: true });

    return {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall, patchActive]);

  // Restore the camera track after screen sharing ends (if a camera call).
  const restoreCameraTrack = useCallback(() => {
    if (!onCameraVideoRef.current || !pcRef.current) return;
    const camTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === "live");
    if (!camTrack) return;
    const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
    if (sender) void sender.replaceTrack(camTrack);
  }, []);

  // Clear the ended-call UI after a short delay.
  useEffect(() => {
    if (!activeCall || activeCall.phase !== "ended") return;
    const t = setTimeout(() => {
      teardown();
      setActiveCall(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [activeCall, teardown]);

  // Auto-start screen sharing once the call connects (used by "Share screen").
  useEffect(() => {
    if (!activeCall || activeCall.phase !== "active") return;
    if (!autoScreenRef.current) return;
    autoScreenRef.current = false;
    void toggleScreenShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.phase]);

  return {
    activeCall,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    resetIncoming: clearIncoming,
  };
}

export { useCallManager };
