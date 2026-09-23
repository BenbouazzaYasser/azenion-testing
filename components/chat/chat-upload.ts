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
  controller: AbortController;
  onProgress?: (progress: UploadProgress) => void;
}

const MAX_CONCURRENT_UPLOADS = 3;
const taskQueue: UploadTask[] = [];
let activeUploads = 0;
// Tasks currently in flight, so cancelAllUploads can abort them too.
const inFlight = new Set<UploadTask>();

function processQueue() {
  while (activeUploads < MAX_CONCURRENT_UPLOADS && taskQueue.length > 0) {
    const task = taskQueue.shift()!;
    activeUploads++;
    inFlight.add(task);
    runUpload(task).finally(() => {
      activeUploads--;
      inFlight.delete(task);
      processQueue();
    });
  }
}

function runUpload(task: UploadTask): Promise<void> {
  const { input, resolve, controller, onProgress } = task;

  return (async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!token || !anonKey || !baseUrl) {
      resolve({ id: input.id, error: "Not authenticated" });
      return;
    }

    const url = `${baseUrl}/storage/v1/object/${CHAT_MEDIA_BUCKET}/${input.path}`;

    // XHR instead of fetch: real upload progress + abortable mid-flight
    // (fetch exposes neither).
    await new Promise<void>((done) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("authorization", `Bearer ${token}`);
      // Deterministic paths (uuid per object) — upsert lets a timed-out
      // upload be retried instead of 409-ing on an already-stored object.
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("content-type", input.mimeType);
      xhr.timeout = UPLOAD_TIMEOUT_MS;

      const finish = (result: UploadTaskResult) => {
        resolve(result);
        done();
      };

      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          finish({
            id: input.id,
            storage_path: input.path,
            filename: input.path.split("/").pop() ?? "file",
            mime_type: input.mimeType,
            file_size: input.blob.size,
          });
        } else {
          let message = `Upload failed (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
            message = body.message ?? body.error ?? message;
          } catch {
            // non-JSON body (Cloudflare etc.) — keep generic message
          }
          finish({ id: input.id, error: message });
        }
      };
      xhr.onerror = () =>
        finish({ id: input.id, error: "Network error uploading file." });
      xhr.ontimeout = () =>
        finish({ id: input.id, error: "Upload timed out. Please retry." });
      xhr.onabort = () =>
        finish({ id: input.id, error: "Upload cancelled." });
      controller.signal.addEventListener("abort", () => xhr.abort(), {
        once: true,
      });
      xhr.send(input.blob);
    });
  })();
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
  if (inputs.length === 0) return Promise.resolve([]);
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
  for (const task of inFlight) {
    task.controller.abort();
  }
}