"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, Video, VideoOff, Monitor, Mic, MicOff, Volume2, VolumeX, Shield, User, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CallModalProps {
  conversationId: string;
  currentUserId: string;
  peer: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
  activeCall: {
    callId: string;
    kind: "audio" | "video" | "screen";
    isIncoming: boolean;
    offerSdp?: any;
  } | null;
  onClose: () => void;
}

export function CallModal({
  conversationId,
  currentUserId,
  peer,
  activeCall,
  onClose,
}: CallModalProps) {
  const [status, setStatus] = useState<"ringing" | "connecting" | "connected" | "ended">(
    activeCall?.isIncoming ? "ringing" : "connecting"
  );
  const [callKind, setCallKind] = useState<"audio" | "video" | "screen">(activeCall?.kind ?? "audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(activeCall?.kind === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(activeCall?.kind === "screen");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string>(activeCall?.callId ?? crypto.randomUUID());

  const supabase = createClient();

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      await supabase.from("call_events").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        call_id: callIdRef.current,
        event_type: "end",
        payload: {},
      });
    } catch {}
    cleanupCall();
    setStatus("ended");
    onClose();
  }, [conversationId, currentUserId, cleanupCall, onClose, supabase]);

  // Initialize WebRTC Peer Connection
  const initPeerConnection = useCallback((callId: string) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void supabase.from("call_events").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          call_id: callId,
          event_type: "ice",
          payload: { candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        }
      }
      remoteStreamRef.current.addTrack(event.track);
      setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  }, [conversationId, currentUserId, supabase]);

  // Start local media stream
  const startLocalMedia = useCallback(async (kind: "audio" | "video" | "screen") => {
    try {
      let stream: MediaStream;
      if (kind === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setIsScreenSharing(true);
      } else if (kind === "video") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setIsVideoOff(false);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsVideoOff(true);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && kind !== "audio") {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      toast.error("Could not access camera/microphone/screen: " + (err?.message || "Permission denied"));
      throw err;
    }
  }, []);

  // Outgoing call initialization
  useEffect(() => {
    if (!activeCall || activeCall.isIncoming) return;

    const callId = activeCall.callId;
    callIdRef.current = callId;
    setCallKind(activeCall.kind);

    let isMounted = true;

    async function startOutgoing() {
      if (!activeCall) return;
      try {
        const stream = await startLocalMedia(activeCall.kind);
        const pc = initPeerConnection(callId);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await supabase.from("call_events").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          call_id: callId,
          event_type: "offer",
          payload: { kind: activeCall.kind, sdp: offer },
        });

        setStatus("connecting");
      } catch (err) {
        if (isMounted) endCall();
      }
    }

    void startOutgoing();

    // Subscribe to answer/ice/end/decline events
    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (row.sender_id === currentUserId) return;

          const pc = pcRef.current;
          if (!pc) return;

          if (row.event_type === "answer" && row.payload?.sdp) {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(row.payload.sdp));
              setStatus("connected");
            }
          } else if (row.event_type === "ice" && row.payload?.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(row.payload.candidate));
            } catch {}
          } else if (row.event_type === "decline") {
            toast.info("Call declined");
            endCall();
          } else if (row.event_type === "end") {
            toast.info("Call ended");
            endCall();
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      cleanupCall();
    };
  }, [activeCall, conversationId, currentUserId, startLocalMedia, initPeerConnection, endCall, cleanupCall, supabase]);

  // Incoming call listeners & event handlers
  useEffect(() => {
    if (!activeCall || !activeCall.isIncoming) return;

    const callId = activeCall.callId;
    callIdRef.current = callId;
    setCallKind(activeCall.kind);

    const channel = supabase
      .channel(`call-incoming:${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (row.sender_id === currentUserId) return;

          const pc = pcRef.current;
          if (row.event_type === "ice" && pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(row.payload.candidate));
            } catch {}
          } else if (row.event_type === "end" || row.event_type === "decline") {
            toast.info("Call ended");
            endCall();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCall, currentUserId, endCall, supabase]);

  // Accept incoming call
  const acceptCall = async () => {
    if (!activeCall) return;
    const callId = activeCall.callId;

    try {
      setStatus("connecting");
      const stream = await startLocalMedia(activeCall.kind);
      const pc = initPeerConnection(callId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from("call_events").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        call_id: callId,
        event_type: "answer",
        payload: { sdp: answer },
      });

      setStatus("connected");
    } catch (err) {
      endCall();
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    if (!activeCall) return;
    try {
      await supabase.from("call_events").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        call_id: activeCall.callId,
        event_type: "decline",
        payload: {},
      });
    } catch {}
    onClose();
  };

  // Toggle controls
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
        setIsMuted(!t.enabled);
      });
    }
  };

  const toggleVideo = async () => {
    if (callKind === "screen") return;
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      } else {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = camStream.getVideoTracks()[0];
          if (!newTrack) return;
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack);
          }
          if (pcRef.current) {
            const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(newTrack);
            else pcRef.current.addTrack(newTrack, localStreamRef.current!);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsVideoOff(false);
          setCallKind("video");
        } catch {}
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }
        if (localStreamRef.current) {
          const oldVideo = localStreamRef.current.getVideoTracks()[0];
          if (oldVideo) {
            localStreamRef.current.removeTrack(oldVideo);
            oldVideo.stop();
          }
          localStreamRef.current.addTrack(screenTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
        setIsScreenSharing(true);
        setCallKind("screen");

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const camTrack = camStream.getVideoTracks()[0];
        if (!camTrack) return;
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(camTrack);
        }
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(camTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
        setIsScreenSharing(false);
        setCallKind("video");
      }
    } catch (err) {
      toast.error("Could not share screen");
    }
  };

  const peerName = peer?.full_name ?? peer?.username ?? "Peer";
  const peerInitial = (peer?.full_name?.[0] ?? peer?.username?.[0] ?? "?").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="relative flex flex-col h-full max-h-[850px] w-full max-w-5xl rounded-3xl border-0 bg-void-900/90 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-0 px-6 py-4 bg-void-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {peer?.avatar_url ? (
              <img src={peer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white font-semibold">
                {peer ? peerInitial : <User size={18} />}
              </span>
            )}
            <div>
              <h2 className="text-sm font-semibold text-ink-50 flex items-center gap-2">
                {peerName}
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase font-semibold text-accent-300">
                  {callKind === "audio" ? "Voice Call" : callKind === "video" ? "Camera Call" : "Screen Share"}
                </span>
              </h2>
              <p className="text-xs text-ink-400 capitalize">
                {status === "ringing" && "Incoming call..."}
                {status === "connecting" && "Connecting..."}
                {status === "connected" && "Connected"}
                {status === "ended" && "Call ended"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 border border-accent/20">
              <Shield size={12} className="text-accent-300" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-accent-300">End-to-End Encrypted</span>
            </div>
            <button
              onClick={endCall}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:text-ink-50 hover:bg-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video / Content Area */}
        <div className="relative flex-1 min-h-0 bg-void-950 flex items-center justify-center overflow-hidden">
          {status === "ringing" && activeCall?.isIncoming ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                {peer?.avatar_url ? (
                  <img src={peer.avatar_url} alt="" className="relative h-28 w-28 rounded-full object-cover shadow-2xl" />
                ) : (
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-accent text-3xl font-bold text-white shadow-2xl">
                    {peerInitial}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-ink-50">{peerName} is calling you...</h3>
              <p className="mt-2 text-sm text-ink-400">
                Incoming {callKind === "audio" ? "voice call" : callKind === "video" ? "camera call" : "screen share"}
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button
                  onClick={declineCall}
                  className="h-14 px-8 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/25"
                >
                  Decline
                </Button>
                <Button
                  onClick={acceptCall}
                  className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/25"
                >
                  Accept Call
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-contain bg-black"
              />

              {status !== "connected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-void-950/90 backdrop-blur-md">
                  <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mb-4" />
                  <p className="text-sm font-medium text-ink-300">
                    {status === "connecting" ? "Establishing secure connection..." : "Ringing..."}
                  </p>
                </div>
              )}

              {callKind !== "audio" && (
                <div className="absolute bottom-6 right-6 h-40 w-72 rounded-2xl overflow-hidden border-0 bg-void-900 shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover mirror"
                  />
                  <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    You ({isScreenSharing ? "Screen" : "Camera"})
                  </div>
                </div>
              )}

              {callKind === "audio" && (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-accent/20 animate-pulse" />
                    {peer?.avatar_url ? (
                      <img src={peer.avatar_url} alt="" className="relative h-32 w-32 rounded-full object-cover shadow-2xl" />
                    ) : (
                      <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-accent text-4xl font-bold text-white shadow-2xl">
                        {peerInitial}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-ink-50">{peerName}</h3>
                  <p className="mt-1 text-sm text-ink-400">Voice call in progress</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {status !== "ringing" && (
          <div className="flex items-center justify-center gap-4 border-0 bg-void-900/80 px-6 py-4 backdrop-blur-md">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-lg border-0",
                isMuted
                  ? "bg-red-500/20 text-red-400"
                  : "bg-surface text-ink-200 hover:bg-surface/80"
              )}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {callKind !== "audio" && (
              <button
                onClick={toggleVideo}
                aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-lg border-0",
                  isVideoOff
                    ? "bg-red-500/20 text-red-400"
                    : "bg-surface text-ink-200 hover:bg-surface/80"
                )}
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            <button
              onClick={toggleScreenShare}
              aria-label={isScreenSharing ? "Stop screen share" : "Start screen share"}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-lg border-0",
                isScreenSharing
                  ? "bg-accent text-white shadow-glow"
                  : "bg-surface text-ink-200 hover:bg-surface/80"
              )}
            >
              <Monitor size={20} />
            </button>

            <button
              onClick={endCall}
              aria-label="End call"
              className="flex h-12 px-6 items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg shadow-red-600/25"
            >
              <PhoneOff size={20} />
              <span>End Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
