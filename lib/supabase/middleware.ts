import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getSupabaseEdgeEnv } from "@/lib/supabase/env";

export function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEdgeEnv();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      global: {
        fetch: fetchWithTimeout,
      },
    },
  );

  return { supabase, response: supabaseResponse };
}
