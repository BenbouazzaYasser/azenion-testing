import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

function GalleryTile({
  src,
  className,
  sizes = "(max-width: 768px) 100vw, 720px",
}: {
  src: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        // bg-ink-500/10 is the zero-JS loading placeholder: the tile keeps
        // its fixed aspect while the image decodes, so no CLS and no blank
        // surface flash.
        "group/tile relative overflow-hidden bg-ink-500/10",
        className,
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-premium group-hover/tile:scale-[1.04]"
      />
    </div>
  );
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const count = images.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <GalleryTile
        src={images[0]!}
        className="aspect-[16/10] w-full rounded-2xl"
      />
    );
  }

  if (count === 2) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <GalleryTile src={images[0]!} className="aspect-[4/3] rounded-xl" />
        <GalleryTile src={images[1]!} className="aspect-[4/3] rounded-xl" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <GalleryTile
          src={images[0]!}
          className="row-span-2 h-full w-full rounded-xl"
        />
        <GalleryTile src={images[1]!} className="aspect-[4/3] rounded-xl" />
        <GalleryTile src={images[2]!} className="aspect-[4/3] rounded-xl" />
      </div>
    );
  }

  const hidden = count - 4;
  const shown = images.slice(0, 4);

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {shown.map((src, i) => (
        <div key={i} className="relative">
          <GalleryTile src={src} className="aspect-[4/3] rounded-xl" />
          {i === 3 && hidden > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-lg font-semibold text-white backdrop-blur-[2px]">
              +{hidden}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
