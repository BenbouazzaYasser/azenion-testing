import { notFound, redirect } from "next/navigation";
import { getPublicProfile } from "@/actions/social.actions";
import { cardBase, sectionCardClass } from "@/components/sections/profile/card-classes";
import { PublicProfileHeader } from "./components/public-profile-header";
import { RelationshipActions } from "./components/relationship-actions";
import { PublicProfileTimeline } from "./components/public-profile-timeline";
import { PublicProfilePosts } from "./components/public-profile-posts";

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;

  const result = await getPublicProfile(username);

  if ("error" in result) {
    if (result.error === "User not found.") {
      notFound();
    }
    // Relationship/load errors surface as a generic card.
    return (
      <div className={`${sectionCardClass} text-center`}>
        <p className="text-sm text-ink-500">{result.error}</p>
      </div>
    );
  }

  const { profile, relationship, privacy, activities, posts } = result.data;

  if (!profile) {
    notFound();
  }

  if (relationship.is_viewer) {
    redirect("/profile");
  }

  const hidden = !privacy.show_profile_publicly && !relationship.is_viewer;

  return (
    <div className="flex flex-col gap-6">
      <PublicProfileHeader profile={profile} cardClass={cardBase} />

      {hidden ? (
        <div className={`${sectionCardClass} text-center`}>
          <p className="text-sm font-medium text-ink-200">This profile is private</p>
          <p className="mt-1.5 text-sm text-ink-600">
            This member has chosen not to share their profile publicly.
          </p>
        </div>
      ) : (
        <>
          <RelationshipActions
            profileId={profile.id}
            relationship={relationship}
            cardClass={cardBase}
          />

          {privacy.show_activity || relationship.is_viewer ? (
            <PublicProfileTimeline activities={activities} cardClass={sectionCardClass} />
          ) : null}

          <PublicProfilePosts posts={posts} cardClass={sectionCardClass} />
        </>
      )}
    </div>
  );
}