import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FeedCard } from "@/components/feed/feed-card";
import { CommentSection } from "@/components/interactions/comment-section";
import { PostViewTracker } from "@/components/interactions/post-view-tracker";
import { getFeedItemById } from "@/actions/feed.actions";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";

interface FeedPostPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: FeedPostPageProps): Promise<Metadata> {
  const item = await getFeedItemById(params.id, null);
  if (!item) {
    return { title: "Post not found — Azenion" };
  }
  return {
    title: item.title ? `${item.title} — Azenion` : "Post — Azenion",
    description: item.body ?? undefined,
  };
}

export default async function FeedPostPage({ params }: FeedPostPageProps) {
  return (
    <>
      <Navbar />
      <main id="main" className="relative min-h-screen overflow-hidden pt-52 pb-24 sm:pt-60 sm:pb-28">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-[720px] px-5 sm:px-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              </div>
            }
          >
            <FeedPost id={params.id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function FeedPost({ id }: { id: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const item = await getFeedItemById(id, userId);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PostViewTracker postId={item.id} />
      <FeedCard item={item} currentUserId={userId} />

      <section className="rounded-2xl card-surface-soft p-5 shadow-card backdrop-blur-xl sm:p-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink-200">
          Comments
        </h2>
        <CommentSection
          targetType={item.source_type}
          targetId={item.source_id ?? ""}
          initialCount={item.comment_count}
          currentUserId={userId}
        />
      </section>
    </div>
  );
}
