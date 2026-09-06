import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // During `next build` (Vercel) env vars may not be present while Next
    // collects/prerenders pages. Return a dummy client so the build doesn't
    // crash with "supabaseUrl is required." — pages marked `force-dynamic`
    // are not executed at build time anyway, and at runtime the real env
    // vars are required (see below).
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return createClient("https://placeholder.supabase.co", "placeholder-key", {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: fetchWithTimeout,
        },
      });
    }
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });
}
