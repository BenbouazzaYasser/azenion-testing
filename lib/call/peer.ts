"use client";

import { getRtcConfiguration } from "@/lib/call/media";

/**
 * Creates a new RTCPeerConnection wired with the provided on-event callbacks.
 * All event callbacks are ["return"] tracked through the returned functions so
 * callers can tear the connection down cleanly.
 */
export function createPeerConnection(handlers: {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onTrack: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onPeerIceRestartNeeded?: () => void;
}): RTCPeerConnection {
  const pc = new RTCPeerConnection(getRtcConfiguration());

  pc.onicecandidate = (e) => {
    if (e.candidate) handlers.onIceCandidate(e.candidate);
  };

  pc.ontrack = (e) => {
    // Combine audio+video tracks from the remote into one stream for <video>.
    const stream = e.streams[0] ?? new MediaStream([e.track]);
    handlers.onTrack(stream);
  };

  pc.onconnectionstatechange = () => {
    handlers.onConnectionStateChange(pc.connectionState);
  };

  return pc;
}

export function closePeerConnection(pc: RTCPeerConnection | null | undefined) {
  if (!pc) return;
  try {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.ondatachannel = null;
  } catch {
    /* noop */
  }
  try {
    pc.close();
  } catch {
    /* noop */
  }
}

export function stopTracks(stream: MediaStream | null | undefined) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* noop */
    }
  });
}
