// Type-only module (plus a tiny window-guarded helper): must stay
// server-importable, so no "use client" directive here.
export type CallKind = "audio" | "video";

export type CallPhase =
  | "idle"
  | "ringing"
  | "incoming"
  | "connecting"
  | "active"
  | "ended";

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
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  screenStream?: MediaStream;
  screenActive: boolean;
  connectionState: RTCPeerConnectionState | "new";
  muted: boolean;
  cameraOff: boolean;
  startedAt: number | null;
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

export interface OfferPayload {
  kind: CallKind;
  sdp: string;
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
