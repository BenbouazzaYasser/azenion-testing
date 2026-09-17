import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const AUTH_TOKEN_RE = /^sb-.+-auth-token$/;

/**
 * The authenticated user for the current request, memoized with React.cache()
 * so every page/layout/data-loader/action that needs the identity shares ONE
 * Supabase Auth round-trip per request instead of firing `auth.getUser()` per
 * call site (a network request each time).
 *
 * Anonymous fast-path: if no Supabase auth cookie is present, skip the
 * network `auth.getUser()` entirely (saves ~300-500ms per anonymous page).
 *
 * Server-only. Never use on the client.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  try {
    const store = await cookies();
    const hasSessionCookie = store.getAll().some(({ name }) => AUTH_TOKEN_RE.test(name));
    if (!hasSessionCookie) return null;
  } catch {
    // cookies() can throw during static generation — fall through to auth check
  }
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
});