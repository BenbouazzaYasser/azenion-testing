"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_AUDIO_MIMES, CHAT_MAX_AUDIO_DURATION_SECONDS } from "@/lib/chat-media";

function pickSupportedMime(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/webm;codecs=opus",
  ];
  // Try candidates that are also in allowlist (or normalize)
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) {
        const base = (c.split(";")[0] ?? "").trim().toLowerCase();
        // Ensure base is allowed (or exact is allowed)
        const allowed = (CHAT_AUDIO_MIMES as readonly string[]).some(
          (a) => a.toLowerCase() === c.toLowerCase() || a.toLowerCase() === base,
        );
        if (allowed) return c;
      }
    } catch {
      // ignore
    }
  }
  // Fallback: try any allowlisted that is supported
  for (const a of CHAT_AUDIO_MIMES) {
    try {
      if (MediaRecorder.isTypeSupported(a)) return a;
    } catch {
      // ignore
    }
  }
  return null;
}

export interface UseVoiceRecorderReturn {
  isSupported: boolean;
  isRecording: boolean;
  duration: number;
  blob: Blob | null;
  previewUrl: string | null;
  mimeType: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  clear: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Diagnostic for tester: log browser capabilities
    console.log("[Voice] Diagnostics", {
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : null,
      mediaDevices: typeof navigator !== "undefined" ? !!navigator.mediaDevices : null,
      getUserMedia: typeof navigator !== "undefined" ? !!navigator.mediaDevices?.getUserMedia : null,
      MediaRecorder: typeof MediaRecorder !== "undefined",
    });
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      console.log("[Voice] Not supported: missing mediaDevices/getUserMedia/MediaRecorder");
      setIsSupported(false);
      return;
    }
    const m = pickSupportedMime();
    console.log("[Voice] Selected recorder MIME:", m);
    if (!m) {
      // Still consider supported but will fallback to default MediaRecorder
      setMimeType(null);
    } else {
      setMimeType(m);
    }
    setIsSupported(true);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [cleanup, previewUrl]);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!isSupported) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chosenMime = mimeType ?? pickSupportedMime() ?? undefined;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setDuration(0);
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        console.log("[Voice] ondataavailable", { size: e.data?.size, type: e.data?.type });
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || chosenMime || "audio/webm";
        const b = new Blob(chunksRef.current, { type: mime });
        const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
        console.log("[Voice] onstop", { mimeType: mime, size: b.size, chunks: chunksRef.current.length, duration: dur, recorderMime: recorder.mimeType, chosenMime });
        setBlob(b);
        const url = URL.createObjectURL(b);
        console.log("[Voice] previewUrl created", { url: url.slice(0, 50), size: b.size });
        // Test local playback before upload
        const testAudio = new Audio(url);
        testAudio.onloadedmetadata = () => console.log("[Voice] local preview duration", testAudio.duration);
        testAudio.onerror = () => console.log("[Voice] local preview error");
        setPreviewUrl(url);
        setMimeType(mime);
        cleanup();
        setIsRecording(false);
      };
      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        cleanup();
        setIsRecording(false);
      };

      recorder.start(100);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= CHAT_MAX_AUDIO_DURATION_SECONDS) {
          recorder.stop();
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Microphone permission denied or not available.";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
        setError("Microphone permission denied. Please allow access in browser settings.");
      } else {
        setError(msg);
      }
      cleanup();
    }
  }, [cleanup, isSupported, mimeType, previewUrl]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    cleanup();
    setIsRecording(false);
    setDuration(0);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    chunksRef.current = [];
  }, [cleanup, isRecording, previewUrl]);

  const clear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setDuration(0);
    setError(null);
  }, [previewUrl]);

  return { isSupported, isRecording, duration, blob, previewUrl, mimeType, error, start, stop, cancel, clear };
}
