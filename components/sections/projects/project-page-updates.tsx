"use client";

import { EntityUpdatesFeed, type UpdateItem, type FeedLabels } from "@/components/sections/entity-feed";
import {
  createProjectUpdate,
  uploadUpdateImage,
  updateProjectUpdate,
  deleteProjectUpdate,
} from "@/actions/project.actions";
import { useTranslation } from "@/components/translation/translation-provider";

interface ProjectPageUpdatesProps {
  projectId: string;
  projectSlug: string;
  updates: UpdateItem[];
  currentUserId: string | null;
  isMember: boolean;
}

export function ProjectPageUpdates({
  projectId,
  projectSlug,
  updates,
  currentUserId,
  isMember,
}: ProjectPageUpdatesProps) {
  const { t } = useTranslation();

  const projectLabels: FeedLabels = {
    badge: t("projects.feedBadge"),
    heading: t("projects.feedHeading"),
    createPlaceholder: t("projects.feedPlaceholder"),
    emptyTitle: t("projects.feedEmptyTitle"),
    emptyMemberDescription: t("projects.feedEmptyMember"),
    emptyNonMemberDescription: t("projects.feedEmptyVisitor"),
    entityIdField: "project_id",
    interactionType: "project_update",
  };

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
