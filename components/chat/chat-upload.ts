"use client";

import { createClient } from "@/lib/supabase/client";
import { CHAT_MEDIA_BUCKET } from "@/lib/chat-media";

/** Max time for a single upload request before we give up and surface an error. */
const UPLOAD_TIMEOUT_MS = 60_000;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadFileInput {
  id: string;
  path: string;
  blob: Blob;
  mimeType: string;
}

export interface UploadResult {
  id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  file_size: number;
}

export interface UploadError {
  id: string;
  error: string;
}

export type UploadTaskResult = UploadResult | UploadError;

interface UploadTask {
  input: UploadFileInput;
  resolve: (result: UploadTaskResult) => void;
  reject: (reason: unknown) => void;
  controller: AbortController;
  onProgress?: (progress: UploadProgress) => void;
}

const MAX_CONCURRENT_UPLOADS = 3;
const taskQueue: UploadTask[] = [];
let activeUploads = 0;

function processQueue() {
  while (activeUploads < MAX_CONCURRENT_UPLOADS && taskQueue.length > 0) {
    const task = taskQueue.shift()!;
    activeUploads++;
    runUpload(task).finally(() => {
      activeUploads--;
      processQueue();
    });
  }
}

async function runUpload(task: UploadTask): Promise<void> {
  const { input, resolve, reject, controller, onProgress } = task;
  console.log("[chat-upload] start", { path: input.path, mimeType: input.mimeType, size: input.blob.size });

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!token || !anonKey || !baseUrl) {
    console.error("[chat-upload] auth missing");
    resolve({ id: input.id, error: "Not authenticated" });
    return;
  }

  const url = `${baseUrl}/storage/v1/object/${CHAT_MEDIA_BUCKET}/${input.path}`;

  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${token}`,
        "x-upsert": "false",
        "content-type": input.mimeType,
      },
      body: input.blob,
      signal: controller.signal,
    });

    // Progress tracking via ReadableStream (fetch doesn't expose upload progress natively in browsers yet)
    // For now we emit a completion event; if needed, we can use XMLHttpRequest for true progress
    if (onProgress) {
      onProgress({ loaded: input.blob.size, total: input.blob.size, percentage: 100 });
    }

    if (!response.ok) {
      let message = `Upload failed (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        // non-JSON body (Cloudflare etc.) — keep generic message
      }
      resolve({ id: input.id, error: message });
      return;
    }

    resolve({
      id: input.id,
      storage_path: input.path,
      filename: input.path.split("/").pop() ?? "file",
      mime_type: input.mimeType,
      file_size: input.blob.size,
    });
    console.log("[chat-upload] ok", { path: input.path, size: input.blob.size });
  } catch (err) {
    const timedOut = controller.signal.aborted;
    console.error("[chat-upload] upload failed", {
      path: input.path,
      mimeType: input.mimeType,
      size: input.blob.size,
      timedOut,
      error: err instanceof Error ? err.message : String(err),
    });
    resolve({ id: input.id, error: timedOut ? "Upload timed out. Please retry." : "Network error uploading file." });
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadChatMediaBlob(
  path: string,
  blob: Blob,
  mimeType: string,
): Promise<{ error: string | null }> {
  // Legacy single-file upload for voice messages etc.
  const result = await uploadBatch([{ id: crypto.randomUUID(), path, blob, mimeType }], undefined);
  const first = result[0];
  if (!first) return { error: "Upload returned no result" };
  if ("error" in first) return { error: first.error };
  return { error: null };
}

export function uploadBatch(
  inputs: UploadFileInput[],
  onProgress?: (id: string, progress: UploadProgress) => void,
): Promise<UploadTaskResult[]> {
  return new Promise((resolve) => {
    const results = new Map<string, UploadTaskResult>();
    let completed = 0;

    for (const input of inputs) {
      const controller = new AbortController();
      const task: UploadTask = {
        input,
        resolve: (result) => {
          results.set(input.id, result);
          completed++;
          if (completed === inputs.length) {
            resolve(inputs.map((i) => results.get(i.id)!));
          }
        },
        reject: () => {},
        controller,
        onProgress: onProgress ? (p) => onProgress(input.id, p) : undefined,
      };
      taskQueue.push(task);
    }

    processQueue();
  });
}

export function cancelAllUploads() {
  for (const task of taskQueue) {
    task.controller.abort();
  }
  taskQueue.length = 0;
  // Note: active uploads cannot be cancelled mid-flight with fetch; they will complete or timeout
}