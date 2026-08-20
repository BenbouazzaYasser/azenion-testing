import { createClient } from "@/lib/supabase/server";

export type Theme = "system" | "light" | "dark";

export interface NotificationSettings {
  team_updates: boolean;
  project_updates: boolean;
  feed_interactions: boolean;
  replies: boolean;
  mentions: boolean;
  branch_announcements: boolean;
  academy_sessions: boolean;
}

export interface PrivacySettings {
  show_profile_publicly: boolean;
  allow_dms: boolean;
  show_activity: boolean;
  search_visibility: boolean;
}

export interface UserSettings {
  theme: Theme;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface DeletionStatus {
  requestedAt: string | null;
  scheduledAt: string | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  team_updates: true,
  project_updates: true,
  feed_interactions: true,
  replies: true,
  mentions: true,
  branch_announcements: true,
  academy_sessions: true,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  show_profile_publicly: true,
  allow_dms: true,
  show_activity: true,
  search_visibility: true,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
  privacy: { ...DEFAULT_PRIVACY_SETTINGS },
};

interface SettingsRow {
  theme: string;
  notifications: Record<string, unknown> | null;
  privacy: Record<string, unknown> | null;
}

function asTheme(value: unknown): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

export function normalizeNotifications(
  raw: Record<string, unknown> | null,
): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(raw ?? {}),
    ...Object.fromEntries(
      Object.keys(DEFAULT_NOTIFICATION_SETTINGS).map((key) => [
        key,
        typeof (raw ?? {})[key] === "boolean" ? (raw ?? {})[key] : DEFAULT_NOTIFICATION_SETTINGS[key as keyof NotificationSettings],
      ]),
    ),
  } as NotificationSettings;
}

export function normalizePrivacy(
  raw: Record<string, unknown> | null,
): PrivacySettings {
  return {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...(raw ?? {}),
    ...Object.fromEntries(
      Object.keys(DEFAULT_PRIVACY_SETTINGS).map((key) => [
        key,
        typeof (raw ?? {})[key] === "boolean" ? (raw ?? {})[key] : DEFAULT_PRIVACY_SETTINGS[key as keyof PrivacySettings],
      ]),
    ),
  } as PrivacySettings;
}

/** Loads the authenticated user's settings, falling back to defaults. */
export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ...DEFAULT_SETTINGS };

  const { data } = await supabase
    .from("user_settings")
    .select("theme, notifications, privacy")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as SettingsRow | null;
  return {
    theme: asTheme(row?.theme),
    notifications: normalizeNotifications(row?.notifications ?? null),
    privacy: normalizePrivacy(row?.privacy ?? null),
  };
}

/** Loads the authenticated user's account-deletion status, if any. */
export async function getDeletionStatus(): Promise<DeletionStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { requestedAt: null, scheduledAt: null };

  const { data } = await supabase
    .from("profiles")
    .select("deletion_requested_at, deletion_scheduled_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    requestedAt: (data?.deletion_requested_at as string | null) ?? null,
    scheduledAt: (data?.deletion_scheduled_at as string | null) ?? null,
  };
}