"use client";

import { EntityUpdatesFeed, type UpdateItem, type FeedLabels } from "@/components/sections/entity-feed";
import {
  createTeamUpdate,
  uploadTeamUpdateImage,
  updateTeamUpdate,
  deleteTeamUpdate,
} from "@/actions/team.actions";

interface TeamFeedProps {
  teamId: string;
  teamSlug: string;
  updates: UpdateItem[];
  currentUserId: string | null;
  isMember: boolean;
  canPost: boolean;
}

const teamLabels: FeedLabels = {
  badge: "Updates",
  heading: "Team Feed",
  createPlaceholder: "What\u2019s new with the team?",
  emptyTitle: "No updates have been shared yet.",
  emptyMemberDescription: "Be the first member to post an update.",
  emptyNonMemberDescription: "Check back later for updates.",
  entityIdField: "team_id",
  interactionType: "team_update",
};

export function TeamFeed({
  teamId,
  teamSlug,
  updates,
  currentUserId,
  isMember,
  canPost,
}: TeamFeedProps) {
  return (
    <EntityUpdatesFeed
      entityId={teamId}
      entitySlug={teamSlug}
      updates={updates}
      currentUserId={currentUserId}
      isMember={isMember}
      canPost={canPost}
      actions={{
        create: createTeamUpdate,
        uploadImage: uploadTeamUpdateImage,
        update: updateTeamUpdate,
        delete: deleteTeamUpdate,
      }}
      labels={teamLabels}
    />
  );
}
