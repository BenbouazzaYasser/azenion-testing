import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { getCurrentUser } from "@/lib/profile-data";
import { getSavedFeedItems } from "@/actions/feed.actions";
import { FeedCard } from "@/components/feed/feed-card";
import { ProfileSubpageHeader } from "@/components/sections/profile/profile-subpage-header";
import { ProfileEmptyCard } from "@/components/sections/profile/profile-empty-card";
import { sectionCardClass } from "@/components/sections/profile/card-classes";

export const metadata: Metadata = {
  title: "Saved Posts | Profile | Azenion",
};

export default async function SavedPostsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { items } = await getSavedFeedItems(user.id);

  return (
    <>
      <ProfileSubpageHeader
        title="Saved Posts"
        description="Posts you've bookmarked across the Limitless Network."
      />
      {items.length > 0 ? (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} currentUserId={user.id} />
          ))}
        </div>
      ) : (
        <ProfileEmptyCard
          icon={<Bookmark className="h-7 w-7" />}
          title="You haven't saved any posts yet"
          description="Tap the bookmark on any feed post to save it here for later."
          href="/feed"
          linkLabel="Explore the Feed"
          cardClass={sectionCardClass}
        />
      )}
    </>
  );
}