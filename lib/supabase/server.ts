import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getSupabaseEnv } from "@/lib/supabase/env";

const getCookieStore = cache(() => cookies());

export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await getCookieStore();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies cannot be modified
          // outside a Server Action or Route Handler. Session refresh is
          // already handled in proxy.ts, so this is safe to skip.
        }
      },
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });
}
