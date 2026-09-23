import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/user";
import { Footer } from "@/components/layout/footer";
import { FeedCard } from "@/components/feed/feed-card";
import { CommentSection } from "@/components/interactions/comment-section";
import { PostViewTracker } from "@/components/interactions/post-view-tracker";
import { getFeedItemById } from "@/actions/feed.actions";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";
import { JsonLd, siteUrl } from "@/components/seo/json-ld";

interface FeedPostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FeedPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getFeedItemById(id, null);
  if (!item) {
    return { title: "Post not found — Azenion" };
  }
  return {
    title: item.title ? `${item.title} — Azenion` : "Post — Azenion",
    description: item.body ?? undefined,
    alternates: {
      canonical: `/feed/post/${id}`,
    },
  };
}

export default async function FeedPostPage({ params }: FeedPostPageProps) {
  const { id } = await params;
  return (
    <>
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
            <FeedPost id={id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function FeedPost({ id }: { id: string }) {
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  const item = await getFeedItemById(id, userId);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">{item.title ?? "Post on Azenion"}</h1>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: item.title ?? "Post on Azenion",
          description: item.body ?? undefined,
          url: `${siteUrl()}/feed/post/${item.id}`,
          publisher: {
            "@type": "Organization",
            name: "Azenion",
            url: siteUrl(),
          },
        }}
      />
      <PostViewTracker postId={item.id} />
      <FeedCard item={item} currentUserId={userId} />

      <section className="rounded-2xl card-surface-soft p-5 shadow-card backdrop-blur-xl sm:p-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-ink-200">
          {await serverT("feed.comments")}
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
