"use client";

import { EntityUpdatesFeed, type UpdateItem, type FeedLabels } from "@/components/sections/entity-feed";
import {
  createTeamUpdate,
  uploadTeamUpdateImage,
  updateTeamUpdate,
  deleteTeamUpdate,
  toggleTeamFeedPin,
} from "@/actions/team.actions";
import { useTranslation } from "@/components/translation/translation-provider";

interface TeamFeedProps {
  teamId: string;
  teamSlug: string;
  updates: UpdateItem[];
  currentUserId: string | null;
  isMember: boolean;
  canPost: boolean;
  canPin: boolean;
}

export function TeamFeed({
  teamId,
  teamSlug,
  updates,
  currentUserId,
  isMember,
  canPost,
  canPin,
}: TeamFeedProps) {
  const { t } = useTranslation();

  const teamLabels: FeedLabels = {
    badge: t("teams.feedBadge"),
    heading: t("teams.feedHeading"),
    createPlaceholder: t("teams.feedPlaceholder"),
    emptyTitle: t("teams.feedEmptyTitle"),
    emptyMemberDescription: t("teams.feedEmptyMember"),
    emptyNonMemberDescription: t("teams.feedEmptyVisitor"),
    entityIdField: "team_id",
    interactionType: "team_update",
  };

  return (
    <EntityUpdatesFeed
      entityId={teamId}
      entitySlug={teamSlug}
      updates={updates}
      currentUserId={currentUserId}
      isMember={isMember}
      canPost={canPost}
      canPin={canPin}
      actions={{
        create: createTeamUpdate,
        uploadImage: uploadTeamUpdateImage,
        update: updateTeamUpdate,
        delete: deleteTeamUpdate,
        togglePin: toggleTeamFeedPin,
      }}
      labels={teamLabels}
    />
  );
}
