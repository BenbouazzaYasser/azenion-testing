import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getAdminSupabaseEnv } from "@/lib/supabase/env";
import { instrumentSupabaseFetch, shouldInstrument } from "@/lib/supabase/instrumented-fetch";

export function createAdminClient() {
  const { url, serviceKey } = getAdminSupabaseEnv();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: shouldInstrument()
        ? instrumentSupabaseFetch(fetchWithTimeout, "admin")
        : fetchWithTimeout,
    },
  });
}
