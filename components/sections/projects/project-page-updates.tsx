"use client";

import { EntityUpdatesFeed, type UpdateItem, type FeedLabels } from "@/components/sections/entity-feed";
import {
  createProjectUpdate,
  uploadUpdateImage,
  updateProjectUpdate,
  deleteProjectUpdate,
} from "@/actions/project.actions";

interface ProjectPageUpdatesProps {
  projectId: string;
  projectSlug: string;
  updates: UpdateItem[];
  currentUserId: string | null;
  isMember: boolean;
}

const projectLabels: FeedLabels = {
  badge: "Progress",
  heading: "Current Progress",
  createPlaceholder: "What did you accomplish?",
  emptyTitle: "No progress has been shared yet.",
  emptyMemberDescription: "Be the first member to post an update.",
  emptyNonMemberDescription: "Check back later for updates.",
  entityIdField: "project_id",
  interactionType: "project_update",
};

export function ProjectPageUpdates({
  projectId,
  projectSlug,
  updates,
  currentUserId,
  isMember,
}: ProjectPageUpdatesProps) {
  return (
    <EntityUpdatesFeed
      entityId={projectId}
      entitySlug={projectSlug}
      updates={updates}
      currentUserId={currentUserId}
      isMember={isMember}
      actions={{
        create: createProjectUpdate,
        uploadImage: uploadUpdateImage,
        update: updateProjectUpdate,
        delete: deleteProjectUpdate,
      }}
      labels={projectLabels}
    />
  );
}
