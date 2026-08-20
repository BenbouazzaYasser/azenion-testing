export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const IMAGE_STORAGE_BUCKET = "feed-images";
export const VIDEO_STORAGE_BUCKET = "feed-videos";

export type FeedMediaKind = "image" | "video";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function extensionForMimeType(type: string): string | null {
  return MIME_TO_EXTENSION[type] ?? null;
}

export function isVideoMimeType(type: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(type);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
