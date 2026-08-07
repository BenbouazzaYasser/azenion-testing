export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const IMAGE_STORAGE_BUCKET = "feed-images";
export const VIDEO_STORAGE_BUCKET = "feed-videos";

export type FeedMediaKind = "image" | "video";

export function isVideoMimeType(type: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(type);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
