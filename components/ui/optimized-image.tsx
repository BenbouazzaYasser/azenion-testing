import Image from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  /**
   * Responsive sizes hint so the browser picks the right srcset entry.
   * Defaults to a small fixed slot (avatars/logos); pass a real value
   * for larger above-the-fold imagery.
   */
  sizes?: string;
  fallback?: React.ReactNode;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  fallback,
}: OptimizedImageProps) {
  if (!src) {
    return (
      <div
        className={cn("flex items-center justify-center bg-accent/[0.08] border border-accent-400/30", className)}
        style={fill ? undefined : { width, height }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-cover", className)}
      priority={priority}
      fill={fill}
      sizes={sizes ?? (fill ? "100vw" : `${width}px`)}
      style={fill ? { objectFit: "cover" } : undefined}
    />
  );
}