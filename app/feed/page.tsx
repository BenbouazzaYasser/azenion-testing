import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/user";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedList } from "@/components/feed/feed-list";
import { getFeedItems } from "@/actions/feed.actions";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "Feed | Azenion — The Limitless Network",
  description:
    "Follow the latest updates from Azenion teams, projects, branches and members across the network.",
  alternates: {
    canonical: "/feed",
  },
};

export default async function FeedPage() {
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  // is_platform_admin and initial feed load are independent — run concurrently
  const [isPlatformAdmin, feed] = await Promise.all([
    (async () => {
      if (!user) return false;
      const supabase = await createClient();
      const { data } = await supabase.rpc("is_platform_admin");
      return data === true;
    })(),
    getFeedItems("all", 1, 20, userId),
  ]);
  const { items, total } = feed;

  return (
    <>
      <Navbar />
      <main id="main" className="relative min-h-screen overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-28">
        <PageAtmosphere />
        <div className="relative mx-auto max-w-[720px] px-5 sm:px-8">
          <div className="mb-8">
            <h1 className="text-[2rem] font-semibold tracking-tight text-ink-50 sm:text-[2.5rem]">
              {await serverT("feed.title")}
            </h1>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-400">
              {await serverT("feed.subtitle")}
            </p>
          </div>

          {user ? (
            <ErrorBoundary
              fallbackTitle="Composer failed to load"
              fallbackMessage="Unable to load the post composer. You can try reloading the page."
            >
              <FeedComposer className="mb-8" />
            </ErrorBoundary>
          ) : null}

          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              </div>
            }
          >
            <ErrorBoundary
              fallbackTitle="Feed failed to load"
              fallbackMessage="Unable to load the feed. You can try reloading the page."
            >
              <FeedList
                initialItems={items}
                initialTotal={total}
                currentUserId={userId}
                isPlatformAdmin={isPlatformAdmin}
              />
            </ErrorBoundary>
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
