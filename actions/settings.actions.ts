"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth.actions";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  normalizeNotifications,
  normalizePrivacy,
  type NotificationSettings,
  type PrivacySettings,
  type Theme,
} from "@/lib/settings-data";

const THEMES: Theme[] = ["system", "light", "dark"];

export interface UpdateSettingsInput {
  theme?: Theme;
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
}

/**
 * Applies a partial settings update (appearance, notifications, and/or privacy)
 * and returns the fully normalized settings for the client to mirror. The
 * authenticated user id is always derived from the server session.
 */
export async function updateSettings(input: UpdateSettingsInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (input.theme !== undefined && !THEMES.includes(input.theme)) {
    return { error: "Invalid theme" };
  }

  const {
    data: existing,
  } = await supabase
    .from("user_settings")
    .select("theme, notifications, privacy")
    .eq("user_id", user.id)
    .maybeSingle();

  const current = (existing ?? {}) as {
    theme?: string;
    notifications?: Record<string, unknown> | null;
    privacy?: Record<string, unknown> | null;
  };

  const nextTheme = THEMES.includes(input.theme as Theme)
    ? (input.theme as Theme)
    : (current.theme as Theme) ?? "system";

  const nextNotifications = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...current.notifications,
    ...input.notifications,
  };
  const nextPrivacy = {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...current.privacy,
    ...input.privacy,
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        theme: nextTheme,
        notifications: nextNotifications,
        privacy: nextPrivacy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {
    success: true,
    settings: {
      theme: nextTheme as Theme,
      notifications: normalizeNotifications(
        nextNotifications as unknown as Record<string, unknown>,
      ),
      privacy: normalizePrivacy(nextPrivacy as unknown as Record<string, unknown>),
    },
  };
}

export async function changeEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const email = (formData.get("email") as string)?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const { error } = await supabase.auth.updateUser({ email });

  if (error) return { error: error.message };

  revalidatePath("/settings", "layout");
  return {
    success: true,
    message: "Verification email sent to your new address.",
  };
}

export async function changeUsername(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const username = (formData.get("username") as string)?.trim();
  if (!username) return { error: "Username is required." };

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: "Usernames must be 3–20 characters: letters, numbers, underscores." };
  }

  const { data: clash } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (clash) return { error: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/profile");
  return { success: true, username };
}

/**
 * Sign out everywhere.
 * The auth backend does not yet expose a cross-session revocation hook, so
 * this returns a not-implemented result while remaining a safe future-ready
 * entry point. When the backend lands, swap the body for a revoke call.
 */
export async function signOutEverywhere() {
  return { unavailable: true };
}

/**
 * Starts the account-deletion appeal window (default 30 days). The account is
 * not deleted yet — the user can appeal any time before the scheduled date.
 */
export async function requestAccountDeletion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: scheduledAt, error } = await supabase.rpc(
    "request_account_deletion",
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true, scheduledAt: (scheduledAt as string | null) ?? null };
}

/** Cancels a pending account deletion (the user's appeal). */
export async function cancelAccountDeletion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.rpc("cancel_account_deletion");

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Best-effort sweep of accounts whose deletion window has elapsed. Called
 * lazily from the app so deletions complete even without a cron job; the
 * pg_cron schedule in the migration is the primary mechanism.
 */
export async function runDeletionSweep() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.rpc("sweep_pending_deletions");
}

export { signOut as signOutCurrentSession };