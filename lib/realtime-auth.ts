"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const readyPromises = new WeakMap<SupabaseClient, Promise<void>>();

/**
 * Resolves once supabase-js has finished loading auth for `supabase` and the
 * realtime client is guaranteed to hold the session's access token.
 *
 * Realtime channels join with whatever access token the socket has at
 * `.subscribe()` time. On a hard refresh the server can render an authenticated
 * page before the browser's supabase-js has finished reading the session, so a
 * component that subscribes immediately lets its channels join anonymously and
 * RLS filters out every event. Callers must await this before creating
 * realtime channels.
 */
export function waitForRealtimeAuthReady(supabase: SupabaseClient): Promise<void> {
  let promise = readyPromises.get(supabase);
  if (!promise) {
    promise = (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (token) {
        await supabase.realtime.setAuth(token);
      }
    })();
    readyPromises.set(supabase, promise);
  }
  return promise;
}