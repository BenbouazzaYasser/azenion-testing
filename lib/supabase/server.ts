import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Same build-time guard as the admin client: allow `next build` to collect
  // pages without real credentials. At runtime the real vars are required.
  const supabaseUrl = url || "https://placeholder.supabase.co";
  const supabaseAnonKey = anonKey || "placeholder-key";

  if ((!url || !anonKey) && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // already handled in middleware.ts, so this is safe to skip.
        }
      },
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });
}
