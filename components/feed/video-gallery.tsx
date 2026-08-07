import { cn } from "@/lib/utils";
import { VideoMedia } from "@/components/feed/video-media";

interface VideoGalleryProps {
  videos: string[];
  className?: string;
}

export function VideoGallery({ videos: list, className }: VideoGalleryProps) {
  const count = list.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <VideoMedia
        src={list[0]!}
        className="aspect-[16/10] w-full rounded-2xl"
      />
    );
  }

  if (count === 2) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <VideoMedia src={list[0]!} className="aspect-[4/3] rounded-xl" />
        <VideoMedia src={list[1]!} className="aspect-[4/3] rounded-xl" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <VideoMedia
          src={list[0]!}
          className="row-span-2 h-full w-full rounded-xl"
        />
        <VideoMedia src={list[1]!} className="aspect-[4/3] rounded-xl" />
        <VideoMedia src={list[2]!} className="aspect-[4/3] rounded-xl" />
      </div>
    );
  }

  const hidden = count - 4;
  const shown = list.slice(0, 4);

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {shown.map((src, i) => (
        <div key={i} className="relative">
          <VideoMedia src={src} className="aspect-[4/3] rounded-xl" />
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