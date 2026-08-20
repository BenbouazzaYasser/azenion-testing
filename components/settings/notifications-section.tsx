"use client";

import { TogglePreferences, type PrefItem } from "./toggle-preferences";
import type { NotificationSettings, PrivacySettings } from "@/lib/settings-data";
import { updateSettings } from "@/actions/settings.actions";

const NOTIFICATION_ITEMS: PrefItem[] = [
  { key: "team_updates", label: "Team updates", description: "Activity within the teams you belong to." },
  { key: "project_updates", label: "Project updates", description: "New updates shared on projects you follow." },
  { key: "feed_interactions", label: "Feed interactions", description: "Likes and comments on your feed posts." },
  { key: "replies", label: "Replies", description: "When someone replies to or likes your comment." },
  { key: "mentions", label: "Mentions", description: "When you are mentioned by username." },
  { key: "branch_announcements", label: "Branch announcements", description: "Announcements from your branches." },
  { key: "academy_sessions", label: "Academy sessions", description: "New and updated academy live sessions." },
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