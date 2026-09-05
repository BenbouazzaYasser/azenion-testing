"use client";

/**
 * WebRTC peer-connection and media capability helpers.
 *
 * STUN servers are free Google STUN (fine for NAT traversal in development and
 * most home/office networks). For production-grade reliability behind strict
 * NATs/firewalls you should add TURN servers — configure them via env vars
 * rather than hardcoding credentials, so secrets never ship to the client.
 *
 *   NEXT_PUBLIC_TURN_URL=turn:host:3478
 *   NEXT_PUBLIC_TURN_USERNAME=...
 *   NEXT_PUBLIC_TURN_CREDENTIAL=...
 */

export const RTC_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function getRtcConfiguration(): RTCConfiguration {
  const servers: RTCIceServer[] = [...RTC_ICE_SERVERS];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl) {
    const server: RTCIceServer = { urls: turnUrl };
    if (turnUsername) server.username = turnUsername;
    if (turnCredential) server.credential = turnCredential;
    servers.push(server);
  }

  return { iceServers: servers };
}

export interface RTCSupport {
  supported: boolean;
  reason?: string;
}

export function getRtcSupport(): RTCSupport {
  if (typeof window === "undefined") return { supported: false, reason: "browser" };
  if (typeof RTCPeerConnection !== "function") {
    return { supported: false, reason: "Your browser does not support WebRTC calls." };
  }
  return { supported: true };
}

export function supportsGetUserMedia(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function supportsGetDisplayMedia(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof (navigator.mediaDevices as MediaDevices).getDisplayMedia === "function"
  );
}

/**
 * Ask for camera+mic (optionally) and surface a human-friendly error when the
 * user denies or none is available. Returns a string error message on failure
 * so callers can show it without crashing.
 */
export async function getStream(
  video: boolean,
  audio: boolean,
): Promise<{ stream?: MediaStream; error?: string }> {
  if (!supportsGetUserMedia()) {
    return { error: "Your browser does not support camera or microphone access." };
  }
  try {
    const constraints: MediaStreamConstraints = {
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotAllowedError") {
      return {
        error: video
          ? "Camera and microphone access was denied. Allow access in your browser to make a video call."
          : "Microphone access was denied. Allow access in your browser to make a voice call.",
      };
    }
    if (name === "NotFoundError") {
      return {
        error: video
          ? "No camera or microphone was found on this device."
          : "No microphone was found on this device.",
      };
    }
    if (name === "NotReadableError") {
      return { error: "Your camera or microphone is in use by another application." };
    }
    if (name === "OverconstrainedError") {
      return { error: "No matching camera or microphone was found." };
    }
    return {
      error:
        "Could not access the camera or microphone. Check your browser permissions and try again.",
    };
  }
}

export async function getScreenStream(): Promise<{
  stream?: MediaStream;
  error?: string;
}> {
  if (!supportsGetDisplayMedia()) {
    return { error: "Your browser does not support screen sharing." };
  }
  try {
    const stream = await (
      navigator.mediaDevices as MediaDevices
    ).getDisplayMedia({
      video: { frameRate: { ideal: 24, max: 30 } },
      audio: false,
    });
    return { stream };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotAllowedError" || name === "AbortError") {
      return { error: "Screen sharing was canceled or denied." };
    }
    return { error: "Could not start screen sharing. Please try again." };
  }
}
