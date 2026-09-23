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
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) {
        const base = (c.split(";")[0] ?? "").trim().toLowerCase();
        const allowed = (CHAT_AUDIO_MIMES as readonly string[]).some(
          (a) => a.toLowerCase() === c.toLowerCase() || a.toLowerCase() === base,
        );
        if (allowed) return c;
      }
    } catch {
      // ignore
    }
  }
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
  /** Frozen seconds: 0 while recording, final length after stop. Live ticking display belongs to <RecordingTimer startedAt>. */
  duration: number;
  /** When the current recording started (ms epoch), null when not recording. */
  startedAt: number | null;
  blob: Blob | null;
  previewUrl: string | null;
  mimeType: string | null;
  error: string | null;
  start: () => Promise<string | null>;
  stop: () => void;
  cancel: () => void;
  clear: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
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
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setIsSupported(false);
      return;
    }
    const m = pickSupportedMime();
    if (!m) {
      setMimeType(null);
    } else {
      setMimeType(m);
    }
    setIsSupported(true);
    return () => {
      mountedRef.current = false;
    };
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

  // Stop tracks/timer on REAL unmount only. This used to list previewUrl in
  // its deps: any preview change re-ran the cleanup, permanently setting
  // mountedRef.current = false, which silently killed the onstop guard (and
  // the start() mounted check) on every recording after the first.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Revoke the previous blob URL whenever the preview is replaced or unmounted.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const start = useCallback(async (): Promise<string | null> => {
    cancelledRef.current = false;
    setError(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!isSupported) {
      const msg = "Voice recording is not supported in this browser.";
      setError(msg);
      return msg;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return "Component unmounted";
      }
      streamRef.current = stream;
      const chosenMime = mimeType ?? pickSupportedMime() ?? undefined;
      // 32kbps mono Opus: optimal for speech, ~1/8 the size of default VBR.
      const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 32_000 };
      if (chosenMime) recorderOptions.mimeType = chosenMime;
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32_000 });
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setDuration(0);
      startTimeRef.current = Date.now();
      setStartedAt(startTimeRef.current);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (cancelledRef.current) {
          return;
        }
        if (!mountedRef.current) return;
        const mime = recorder.mimeType || chosenMime || "audio/webm";
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        setMimeType(mime);
        // Freeze the final length once; no per-tick state (that re-rendered
        // the whole consumer tree every 500ms — the live display now ticks
        // inside <RecordingTimer>).
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setStartedAt(null);
        cleanup();
        setIsRecording(false);
      };
      recorder.onerror = () => {
        if (!mountedRef.current) return;
        setError("Recording failed. Please try again.");
        setStartedAt(null);
        cleanup();
        setIsRecording(false);
      };

      recorder.start(100);
      setIsRecording(true);

      // Auto-stop only — no setState here, so the interval never re-renders
      // the consumer tree (ponytail: live display lives in <RecordingTimer>).
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (!mountedRef.current) return;
        if (elapsed >= CHAT_MAX_AUDIO_DURATION_SECONDS) {
          if (recorder.state === "recording") {
            recorder.stop();
          }
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 500);
      return null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Microphone permission denied or not available.";
      let friendly = msg;
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
        friendly = "Microphone permission denied. Please allow access in browser settings.";
      }
      if (mountedRef.current) setError(friendly);
      cleanup();
      return friendly;
    }
  }, [cleanup, isSupported, mimeType, previewUrl]);

  const stop = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === "recording") {
      try {
        r.stop();
      } catch {
        // ignore
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const r = mediaRecorderRef.current;
    if (r && r.state === "recording") {
      try {
        r.stop();
      } catch {
        // ignore
      }
    }
    cleanup();
    setIsRecording(false);
    setDuration(0);
    setStartedAt(null);
    setBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    chunksRef.current = [];
  }, [cleanup, previewUrl]);

  const clear = useCallback(() => {
    cancelledRef.current = false;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setDuration(0);
    setError(null);
  }, [previewUrl]);

  return { isSupported, isRecording, duration, startedAt, blob, previewUrl, mimeType, error, start, stop, cancel, clear };
}
