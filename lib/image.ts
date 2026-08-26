/**
 * Image optimization utilities for better performance
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "jpg" | "png";
}

/**
 * Generate Supabase storage URL with optimization parameters
 * @param bucket - Storage bucket name
 * @param path - Path to the image in the bucket
 * @param options - Optimization options (quality, resize, etc)
 */
export function getOptimizedImageUrl(
  bucket: string,
  path: string,
  options?: ImageOptimizationOptions
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "";

  const { width, height, quality = 80, format = "webp" } = options || {};
  
  let url = `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;

  // Add query parameters for CDN transformations if needed
  const params = new URLSearchParams();
  if (width) params.append("width", width.toString());
  if (height) params.append("height", height.toString());
  if (quality) params.append("quality", quality.toString());

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * Common image sizes for responsive images
 */
export const IMAGE_SIZES = {
  avatar: {
    small: 40,
    medium: 64,
    large: 96,
  },
  thumbnail: {
    small: 150,
    medium: 300,
    large: 600,
  },
  banner: {
    small: 400,
    medium: 800,
    large: 1200,
  },
} as const;

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  bucket: string,
  path: string,
  sizes: number[]
): string {
  return sizes
    .map(
      (size) =>
        `${getOptimizedImageUrl(bucket, path, { width: size, quality: 80 })} ${size}w`
    )
    .join(", ");
}
