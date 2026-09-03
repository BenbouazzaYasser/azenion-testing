"use client";

export type CallKind = "audio" | "video";

export type CallPhase =
  | "idle"
  | "ringing" // outgoing — waiting for the peer to pick up
  | "incoming" // incoming offer awaiting accept/decline
  | "connecting" // offer/answer exchanged, ICE gathering
  | "active" // media flowing
  | "ended"; // terminal

export type CallRole = "caller" | "callee";

export type CallEventType =
  | "offer"
  | "answer"
  | "ice"
  | "decline"
  | "cancel"
  | "end"
  | "busy"
  | "screen";

export interface CallPeer {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

export interface CallSession {
  callId: string;
  conversationId: string;
  kind: CallKind;
  phase: CallPhase;
  role: CallRole;
  peer: CallPeer;
  // Connecting/active only:
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  screenStream?: MediaStream;
  screenActive: boolean;
  connectionState: RTCPeerConnectionState | "new";
  muted: boolean;
  cameraOff: boolean;
  startedAt: number | null; // epoch ms when the call became active
  endedAt: number | null;
  endReason?: "ended" | "declined" | "canceled" | "busy" | "peer-left" | "error" | "timeout";
  error?: string;
}

export interface IncomingCallInfo {
  callId: string;
  conversationId: string;
  senderId: string;
  kind: CallKind;
}

/** Payload shapes carried inside call_events.payload */
export interface OfferPayload {
  kind: CallKind;
  sdp: string;
  /** Present when the caller starts the call already sharing their screen. */
  screen?: boolean;
}

export interface AnswerPayload {
  sdp: string;
  screen?: boolean;
}

export interface IcePayload {
  candidate: RTCIceCandidateInit;
}

export interface ScreenPayload {
  start: boolean;
}

export const isAudioContextSupported = (): boolean =>
  typeof window !== "undefined" && typeof window.AudioContext !== "undefined";
