"use client";

/**
 * WebRTC peer-connection and media capability helpers.
 *
 * STUN servers are free Google STUN (fine for NAT traversal in development and
 * most home/office networks). For production-grade reliability behind strict
 * NATs/firewalls you add a TURN server.
 *
 * SECURITY MODEL FOR TURN CREDENTIALS
 * -----------------------------------
 * WebRTC requires the ICE configuration (including any TURN server + its
 * credentials) to be present in the BROWSER, because the browser itself is
 * what establishes the peer connection. A static shared TURN credential
 * therefore cannot be a secret: anything inlined into the client bundle is
 * readable by anyone. Do NOT ship long-lived TURN secrets via NEXT_PUBLIC_*
 * env vars — that would permanently expose them.
 *
 * Two safe options:
 *   1. A public/unauthenticated TURN server: set NEXT_PUBLIC_TURN_URL to the
 *      turn(s)/turns(s) URL. This is consumer software's default model.
 *   2. Authenticated TURN (e.g. coturn with --use-auth-secret / TURN REST
 *      API): mint SHORT-LIVED credentials on the server (a server action /
 *      API route behind the session user) at call time and hand them to
 *      outbound-only. Never configure a static TURN username/password in
 *      NEXT_PUBLIC_* vars. If you implement this, fetch the freshly minted
 *      { username, credential } from the server and extend getRtcConfiguration
 *      to accept it as an argument — do not inline the TTL-less secret.
 */

export const RTC_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function getRtcConfiguration(): RTCConfiguration {
  const servers: RTCIceServer[] = [...RTC_ICE_SERVERS];

  // Public (no-auth) TURN endpoint. NEVER pair this with static credentials —
  // see the security model above. Authenticated TURN secrets must come from
  // a server-minted short-lived credential endpoint instead.
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;

  if (turnUrl) {
    servers.push({ urls: turnUrl });
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
