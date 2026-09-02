import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// ── Bucket / marker ─────────────────────────────────────────────────────────

export const CHAT_MEDIA_BUCKET = "chat-media";
export const CHAT_MEDIA_PREFIX = "chat-media/";
/** Signed URL TTL for private chat media (seconds). Keep short; never persist URL. */
export const CHAT_MEDIA_SIGNED_URL_TTL = 60;

// ── Attachment types ────────────────────────────────────────────────────────

export type ChatAttachmentType = "image" | "file" | "audio" | "gif" | "sticker";

// ── Size limits (centralized, reused by Phase 2/3) ─────────────────────────

export const CHAT_MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
export const CHAT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const CHAT_MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB
export const CHAT_MAX_AUDIO_DURATION_SECONDS = 120; // 2 min
export const CHAT_MAX_FILENAME_LENGTH = 255;

// ── MIME allowlists (server-side validated) ─────────────────────────────────
// Keep executables / html / svg-embedded scripts out. This list is intentionally
// narrow; expand only after security review.

export const CHAT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const CHAT_FILE_MIMES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

export const CHAT_AUDIO_MIMES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/webm;codecs=opus",
] as const;

const IMAGE_SET = new Set<string>(CHAT_IMAGE_MIMES);
const FILE_SET = new Set<string>(CHAT_FILE_MIMES);
const AUDIO_SET = new Set<string>(CHAT_AUDIO_MIMES);

// Union of all storage-backed mime types (gif/sticker are provider-backed)
const ALL_STORAGE_MIMES = new Set<string>([...CHAT_IMAGE_MIMES, ...CHAT_FILE_MIMES, ...CHAT_AUDIO_MIMES]);

// ── helpers ─────────────────────────────────────────────────────────────────

export function formatChatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function getAllowedMimesForType(type: ChatAttachmentType): readonly string[] {
  switch (type) {
    case "image":
      return CHAT_IMAGE_MIMES;
    case "file":
      return CHAT_FILE_MIMES;
    case "audio":
      return CHAT_AUDIO_MIMES;
    case "gif":
    case "sticker":
      return [];
    default:
      return [];
  }
}

export function getMaxSizeForType(type: ChatAttachmentType): number {
  switch (type) {
    case "image":
      return CHAT_MAX_IMAGE_SIZE;
    case "file":
      return CHAT_MAX_FILE_SIZE;
    case "audio":
      return CHAT_MAX_AUDIO_SIZE;
    case "gif":
    case "sticker":
      return 0;
    default:
      return 0;
  }
}

/**
 * Sanitize a filename for safe storage:
 * - strip directory traversal
 * - replace unsafe chars with _
 * - truncate to CHAT_MAX_FILENAME_LENGTH
 * - ensure not empty
 */
export function sanitizeFilename(filename: string): string {
  // Take basename only
  const base = filename.split("/").pop()?.split("\\").pop() ?? filename;
  // Replace control chars and unsafe symbols
  let sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Collapse repeated _
  sanitized = sanitized.replace(/_+/g, "_");
  // Remove leading dot (hidden file)
  sanitized = sanitized.replace(/^\.+/, "");
  // Fallback
  if (!sanitized || sanitized === "_" || sanitized.length === 0) {
    sanitized = "file";
  }
  // Truncate preserving extension if possible
  if (sanitized.length > CHAT_MAX_FILENAME_LENGTH) {
    const dot = sanitized.lastIndexOf(".");
    if (dot !== -1 && dot < sanitized.length - 1) {
      const ext = sanitized.slice(dot);
      const name = sanitized.slice(0, CHAT_MAX_FILENAME_LENGTH - ext.length);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.slice(0, CHAT_MAX_FILENAME_LENGTH);
    }
  }
  return sanitized;
}

/**
 * Generate a conversation-scoped storage path.
 * Server must call this — never trust a client-provided path.
 * Example: chat/{conversationId}/{attachmentId}/{sanitizedFilename}
 */
export function getChatMediaObjectPath(
  conversationId: string,
  attachmentId: string,
  filename: string,
): string {
  const safe = sanitizeFilename(filename);
  return `chat/${conversationId}/${attachmentId}/${safe}`;
}

export function isChatMediaMarker(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(CHAT_MEDIA_PREFIX);
}

/** "chat-media/chat/abc/file.png" -> "chat/abc/file.png" */
export function objectPathFromChatMarker(marker: string): string {
  return marker.startsWith(CHAT_MEDIA_PREFIX) ? marker.slice(CHAT_MEDIA_PREFIX.length) : marker;
}

export function chatMediaMarkerFor(objectPath: string): string {
  return `${CHAT_MEDIA_PREFIX}${objectPath}`;
}

// ── validation ──────────────────────────────────────────────────────────────

export interface ChatAttachmentValidationInput {
  type: ChatAttachmentType;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  storagePath?: string | null;
  provider?: string | null;
  externalId?: string | null;
  metadata?: unknown;
}

export interface ChatAttachmentValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

/**
 * Server-side validation for a chat attachment.
 * Rejects invalid MIME, oversized files, bad metadata, unsanitized paths.
 */
export function validateChatAttachmentInput(input: ChatAttachmentValidationInput): ChatAttachmentValidationResult {
  const { type, filename, mimeType, fileSize, durationSeconds, storagePath, provider, externalId, metadata } = input;

  if (!["image", "file", "audio", "gif", "sticker"].includes(type)) {
    return { valid: false, error: "Invalid attachment type." };
  }

  // Storage-backed types
  if (type === "image" || type === "file" || type === "audio") {
    if (!storagePath) {
      return { valid: false, error: "storagePath is required for this attachment type." };
    }
    // Path must be conversation-scoped: chat/{uuid}/...
    if (!storagePath.startsWith("chat/")) {
      return { valid: false, error: "Invalid storage path." };
    }
    const parts = storagePath.split("/");
    if (parts.length < 3) {
      return { valid: false, error: "Invalid storage path structure." };
    }
    const convId = parts[1] as string;
    // Validate uuid-ish (basic)
    if (!/^[0-9a-fA-F-]{36}$/.test(convId)) {
      return { valid: false, error: "Invalid conversation id in storage path." };
    }

    if (!mimeType || typeof mimeType !== "string") {
      return { valid: false, error: "MIME type is required." };
    }
    const normalizedMime = (mimeType.toLowerCase().split(";")[0] ?? "").trim();
    const lowerMime = mimeType.toLowerCase();
    // Strict per-type allowlist (do not use global set — e.g. audio mime must not be accepted for image)
    const allowed = getAllowedMimesForType(type) as readonly string[];
    const isAllowed = allowed.includes(normalizedMime) || allowed.includes(lowerMime);
    if (!isAllowed) {
      return { valid: false, error: `MIME type ${mimeType} is not allowed for ${type}.` };
    }

    if (fileSize == null || typeof fileSize !== "number" || fileSize <= 0) {
      return { valid: false, error: "File size is required and must be positive." };
    }
    const max = getMaxSizeForType(type);
    if (fileSize > max) {
      return { valid: false, error: `File too large. Max ${formatChatFileSize(max)}, got ${formatChatFileSize(fileSize)}.` };
    }

    if (!filename || typeof filename !== "string" || filename.trim().length === 0) {
      return { valid: false, error: "Filename is required." };
    }
    const sanitized = sanitizeFilename(filename);
    if (sanitized.length === 0 || sanitized.length > CHAT_MAX_FILENAME_LENGTH) {
      return { valid: false, error: "Invalid filename." };
    }

    if (type === "audio" && durationSeconds != null) {
      if (typeof durationSeconds !== "number" || durationSeconds < 0) {
        return { valid: false, error: "Invalid audio duration." };
      }
      if (durationSeconds > CHAT_MAX_AUDIO_DURATION_SECONDS) {
        return { valid: false, error: `Audio too long. Max ${CHAT_MAX_AUDIO_DURATION_SECONDS}s.` };
      }
    }

    // provider/external_id should be null for storage-backed types
    if (provider || externalId) {
      // not strictly error, but warn — we enforce null for safety
      return { valid: false, error: "Provider fields must be empty for storage-backed attachments." };
    }

    if (metadata != null && typeof metadata !== "object") {
      return { valid: false, error: "Invalid metadata." };
    }

    return { valid: true, sanitizedFilename: sanitized };
  }

  // Provider-backed types (gif/sticker)
  if (type === "gif" || type === "sticker") {
    if (!provider || typeof provider !== "string" || provider.trim().length === 0) {
      return { valid: false, error: "Provider is required for this type." };
    }
    if (!externalId || typeof externalId !== "string" || externalId.trim().length === 0) {
      return { valid: false, error: "External ID is required for this type." };
    }
    if (storagePath) {
      return { valid: false, error: "storagePath must be empty for provider-backed attachments." };
    }
    if (metadata != null && typeof metadata !== "object") {
      return { valid: false, error: "Invalid metadata." };
    }
    return { valid: true };
  }

  return { valid: false, error: "Unhandled validation case." };
}

/**
 * Validate attachment metadata shape (JSON). Keep permissive but ensure it is
 * an object and not excessively large.
 */
export function validateAttachmentMetadata(metadata: unknown): { valid: boolean; error?: string } {
  if (metadata == null) return { valid: true };
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return { valid: false, error: "Metadata must be an object." };
  }
  try {
    const serialized = JSON.stringify(metadata);
    if (serialized.length > 10_000) {
      return { valid: false, error: "Metadata too large." };
    }
  } catch {
    return { valid: false, error: "Metadata is not serializable." };
  }
  return { valid: true };
}

// ── signed URL resolution (private marker -> signed URL) ────────────────────

/**
 * Resolve a stored chat-media marker to a signed URL.
 * Returns null if not a marker or not authorized.
 * Mirrors lib/media.ts:resolveMediaValue but for chat-media.
 */
export async function resolveChatMediaValue(
  value: string | null | undefined,
  ttlSeconds: number = CHAT_MEDIA_SIGNED_URL_TTL,
  supabase?: SupabaseClient<Database>,
): Promise<string | null> {
  if (!value) return null;
  if (!isChatMediaMarker(value)) return value;
  const client = supabase ?? createAdminClient();
  const objectPath = objectPathFromChatMarker(value);
  const { data, error } = await client.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(objectPath, ttlSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Batch resolve.
 */
export async function resolveChatMediaValues(
  values: (string | null | undefined)[],
  ttlSeconds: number = CHAT_MEDIA_SIGNED_URL_TTL,
  supabase?: SupabaseClient<Database>,
): Promise<(string | null)[]> {
  return Promise.all(values.map((v) => resolveChatMediaValue(v, ttlSeconds, supabase)));
}
