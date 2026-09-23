"use client";

// Client-side image compression for chat/feed uploads. Instantly-visible blob
// previews keep the ORIGINAL file; this runs in the background and swaps the
// queued file for a downscaled WebP (JPEG fallback). On any failure/timeout
// the original file is used, so uploads are never blocked.

const MAX_EDGE = 1920; // max width/height after compression
const QUALITY = 0.78;
const SKIP_BELOW_BYTES = 150_000; // leave genuinely small files alone
const TIMEOUT_MS = 3000; // low-end devices: fall back to original after 3s

// Images canvas can't faithfully re-encode, or that decode-fail anyway.
const UNCOMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/svg+xml", // vector
  "image/gif", // animated — canvas keeps only the first frame
  "image/heic",
  "image/heif", // no browser canvas decode
]);

/** Pure decision: should this file go through the compression pipeline? */
export function shouldCompressImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (!type.startsWith("image/")) return false;
  if (UNCOMPRESSIBLE_IMAGE_TYPES.has(type)) return false;
  if (file.size < SKIP_BELOW_BYTES) return false;
  return true;
}

/** `photo.PNG` + webp -> `photo.webp` */
export function withImageExtension(name: string, mime: string): string {
  const stem = name.replace(/\.[a-z0-9]+$/i, "");
  return `${stem}.${mime === "image/jpeg" ? "jpg" : "webp"}`;
}

/**
 * Return a downscaled/compressed File, or the SAME File instance when the
 * image is skipped, compression fails, times out, or doesn't shrink.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!shouldCompressImage(file)) return file;

  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("compress timeout")), TIMEOUT_MS),
  );
  try {
    const blob = await Promise.race([encode(file), timer]);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], withImageExtension(file.name, blob.type), { type: blob.type });
  } catch {
    return file;
  }
}

async function encode(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const webp = await toBlob(canvas, "image/webp", QUALITY);
    if (webp) return webp;

    // JPEG fallback: flatten alpha onto white first.
    const flat = document.createElement("canvas");
    flat.width = w;
    flat.height = h;
    const fctx = flat.getContext("2d");
    if (!fctx) return null;
    fctx.fillStyle = "#fff";
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(canvas, 0, 0);
    return toBlob(flat, "image/jpeg", QUALITY);
  } finally {
    bitmap.close();
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}