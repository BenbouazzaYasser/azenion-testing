import Link from "next/link";
import { MessageSquare, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";
import { ImageGallery } from "@/components/feed/image-gallery";
import { VideoGallery } from "@/components/feed/video-gallery";

interface PublicPost {
  id: string;
  title: string;
  body: string | null;
  images: string[];
  videos: string[];
  created_at: string;
}

interface PublicProfilePostsProps {
  posts: PublicPost[];
  cardClass: string;
}

export function PublicProfilePosts({ posts, cardClass }: PublicProfilePostsProps) {
  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">Posts</h2>

      {posts.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300">
            <Newspaper className="h-6 w-6 text-accent-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-200">No public posts yet</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-600">
              Posts shared to the feed will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/feed/post/${post.id}`}
              className="group block rounded-2xl border border-border-strong/[0.08] bg-surface p-5 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:shadow-glow-sm"
            >
              {post.images.length > 0 ? (
                <ImageGallery images={post.images} className="mb-4" />
              ) : null}
              {post.videos.length > 0 ? (
                <div className="mb-4">
                  <VideoGallery videos={post.videos} />
                </div>
              ) : null}
              {post.title ? (
                <p className="text-sm font-medium text-ink-50 group-hover:text-accent-200">
                  {post.title}
                </p>
              ) : null}
              {post.body ? (
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-400">
                  {post.body}
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-3 text-xs text-ink-600">
                <span>{formatDistanceToNow(new Date(post.created_at))}</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={12} />
                  View post
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}