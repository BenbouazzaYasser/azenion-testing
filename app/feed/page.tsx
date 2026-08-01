import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FeedList } from "@/components/feed/feed-list";
import { getFeedItems } from "@/actions/feed.actions";

export const metadata: Metadata = {
  title: "Feed — Azenion",
  description: "Stay up to date with projects, teams, and branches across Azenion.",
};

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const { items, total } = await getFeedItems("all", 1, 20, userId);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="relative min-h-screen pt-52 pb-28 sm:pt-60 sm:pb-32">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.10),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <div className="relative mx-auto max-w-[720px] px-5 sm:px-8">
          <div className="mb-8">
            <h1 className="text-[2rem] font-semibold tracking-tight text-ink-50 sm:text-[2.5rem]">
              Feed
            </h1>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-400">
              Stay up to date with projects, teams, and branches across Azenion.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              </div>
            }
          >
            <FeedList initialItems={items} initialTotal={total} currentUserId={userId} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
