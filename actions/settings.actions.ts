"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/actions/auth.actions";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_SETTINGS,
  normalizeNotifications,
  normalizePrivacy,
  type NotificationSettings,
  type PrivacySettings,
  type Theme,
} from "@/lib/settings-data";
import { isValidLanguage } from "@/lib/translation/languages";

const THEMES: Theme[] = ["system", "light", "dark"];

export interface UpdateSettingsInput {
  theme?: Theme;
  language?: string;
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
}

/**
 * Applies a partial settings update (appearance, notifications, and/or privacy)
 * and returns the fully normalized settings for the client to mirror. The
 * authenticated user id is always derived from the server session.
 */
export async function updateSettings(input: UpdateSettingsInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (input.theme !== undefined && !THEMES.includes(input.theme)) {
    return { error: "Invalid theme" };
  }
  if (input.language !== undefined && !isValidLanguage(input.language)) {
    return { error: "Invalid language" };
  }

  const {
    data: existing,
  } = await supabase
    .from("user_settings")
    .select("theme, language, notifications, privacy")
    .eq("user_id", user.id)
    .maybeSingle();

  const current = (existing ?? {}) as {
    theme?: string;
    language?: string | null;
    notifications?: Record<string, unknown> | null;
    privacy?: Record<string, unknown> | null;
  };

  const nextTheme = THEMES.includes(input.theme as Theme)
    ? (input.theme as Theme)
    : (current.theme as Theme) ?? "system";

  const nextLanguage =
    input.language !== undefined && isValidLanguage(input.language)
      ? input.language
      : (current.language ?? DEFAULT_SETTINGS.language);

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

  let { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        theme: nextTheme,
        language: nextLanguage,
        notifications: nextNotifications,
        privacy: nextPrivacy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  // Graceful fallback if migration 00107 hasn't been applied yet.
  if (error && /language/i.test(error.message)) {
    const retry = await supabase
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
    if (!retry.error) {
      // storage/cookie already persist client side; still report success
      revalidatePath("/settings");
      return {
        success: true,
        settings: {
          theme: nextTheme as Theme,
          language: nextLanguage,
          notifications: normalizeNotifications(
            nextNotifications as unknown as Record<string, unknown>,
          ),
          privacy: normalizePrivacy(nextPrivacy as unknown as Record<string, unknown>),
        },
      };
    }
  }

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {
    success: true,
    settings: {
      theme: nextTheme as Theme,
      language: nextLanguage,
      notifications: normalizeNotifications(
        nextNotifications as unknown as Record<string, unknown>,
      ),
      privacy: normalizePrivacy(nextPrivacy as unknown as Record<string, unknown>),
    },
  };
}

export async function changeEmail(formData: FormData) {
  const supabase = createClient();
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
  const supabase = createClient();
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
 * Sign out everywhere (all devices/sessions for the current user).
 *
 * The target identity is derived exclusively from the current server session;
 * no caller-supplied user id is accepted, so a user can only revoke their
 * own sessions. Revocation runs through the Supabase Auth Admin API on the
 * server (service-role client never leaves the server).
 *
 * Scope: revokes refresh-token/session state globally (`global` scope), which
 * signs the user out on every device. It does NOT instantly invalidate
 * already-issued short-lived access JWTs (they expire naturally), does NOT
 * revoke push-device tokens, does NOT delete the account, and does NOT
 * affect any other user.
 */
export async function signOutEverywhere() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) return { error: "No active session found." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(accessToken, "global");

  if (error) return { error: error.message };

  return { success: true };
}

export { signOut as signOutCurrentSession };
