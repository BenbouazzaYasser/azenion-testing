import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedList } from "@/components/feed/feed-list";
import { getFeedItems } from "@/actions/feed.actions";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { serverT } from "@/lib/translation/server";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const isPlatformAdmin = user ? (await supabase.rpc("is_platform_admin"))?.data === true : false;

  const { items, total } = await getFeedItems("all", 1, 20, userId);

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

          {user ? <FeedComposer className="mb-8" /> : null}

          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              </div>
            }
          >
            <FeedList
              initialItems={items}
              initialTotal={total}
              currentUserId={userId}
              isPlatformAdmin={isPlatformAdmin}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
