"use client";

import { createClient } from "@/lib/supabase/client";

export interface CurrentUserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string;
}

/**
 * One-flight fetch of the signed-in user's profile, shared across
 * components so optimistic UI (chat sends, comments) never awaits a
 * profile query before rendering — the promise resolves once and every
 * caller reuses it.
 */
let profilePromise: Promise<CurrentUserProfile | null> | null = null;

export function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (!profilePromise) {
    profilePromise = (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .eq("id", user.id)
          .single();
        return data ?? null;
      } catch {
        return null;
      }
    })();
  }
  return profilePromise;
}