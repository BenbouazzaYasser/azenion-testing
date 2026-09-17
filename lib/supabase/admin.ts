import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getAdminSupabaseEnv } from "@/lib/supabase/env";

export function createAdminClient() {
  const { url, serviceKey } = getAdminSupabaseEnv();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });
}
