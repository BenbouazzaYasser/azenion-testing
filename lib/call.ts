export type CallKind = "audio" | "video";
export type CallEventType = "offer" | "answer" | "ice" | "cancel" | "decline" | "busy" | "end";

export type CallPhase =
  | "idle"
  | "outgoing" // caller: offer sent, waiting for answer
  | "incoming" // callee: offer received, waiting for accept/decline
  | "connecting" // answer exchanged, waiting for ICE to connect
  | "active" // RTC connected
  | "ended"; // transient "call ended" notice before returning to idle

export interface CallEvent {
  id: string;
  conversation_id: string;
  sender_id: string;
  call_id: string;
  event_type: CallEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CallPeer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string;
}

export interface OfferPayload {
  kind: CallKind;
  sdp: string;
}

export interface AnswerPayload {
  sdp: string;
}

export interface IcePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export const RING_TIMEOUT_MS = 45_000;
export const INCOMING_TIMEOUT_MS = 60_000;
export const CONNECTING_TIMEOUT_MS = 30_000;
export const DISCONNECT_WAIT_MS = 6_000;

export function peerDisplayName(peer: CallPeer | null): string {
  return peer?.full_name ?? peer?.username ?? "Unknown";
}

export function peerInitial(peer: CallPeer | null): string {
  return (peer?.full_name?.[0] ?? peer?.username?.[0] ?? "?").toUpperCase();
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
