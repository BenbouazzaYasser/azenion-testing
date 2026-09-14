import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated user for the current request, memoized with React.cache()
 * so every page/layout/data-loader/action that needs the identity shares ONE
 * Supabase Auth round-trip per request instead of firing `auth.getUser()` per
 * call site (a network request each time).
 *
 * Server-only. Never use on the client.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
});