"use client";

import { TogglePreferences, type PrefItem } from "./toggle-preferences";
import type { NotificationSettings, PrivacySettings } from "@/lib/settings-data";
import { updateSettings } from "@/actions/settings.actions";

const NOTIFICATION_ITEMS: PrefItem[] = [
  { key: "team_updates", labelKey: "settings.notifTeamUpdates", descriptionKey: "settings.notifTeamUpdatesDesc" },
  { key: "project_updates", labelKey: "settings.notifProjectUpdates", descriptionKey: "settings.notifProjectUpdatesDesc" },
  { key: "feed_interactions", labelKey: "settings.notifFeedInteractions", descriptionKey: "settings.notifFeedInteractionsDesc" },
  { key: "replies", labelKey: "settings.notifReplies", descriptionKey: "settings.notifRepliesDesc" },
  { key: "mentions", labelKey: "settings.notifMentions", descriptionKey: "settings.notifMentionsDesc" },
  { key: "branch_announcements", labelKey: "settings.notifBranchAnnouncements", descriptionKey: "settings.notifBranchAnnouncementsDesc" },
  { key: "academy_sessions", labelKey: "settings.notifAcademySessions", descriptionKey: "settings.notifAcademySessionsDesc" },
];

export function NotificationsSection({ initial }: { initial: NotificationSettings }) {
  return (
    <TogglePreferences
      items={NOTIFICATION_ITEMS}
      initial={{ ...initial }}
      saveAction={(patch) => updateSettings({ notifications: patch })}
    />
  );
}